import json,re,os,sys,collections,unicodedata
S=os.environ.get("SDL_PIPE") or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),".."))
R=os.environ.get("SDL_SITE") or os.path.abspath(os.path.join(S,"..","site"))
G=json.load(open(f"{S}/graph.json"))
vocab={v["id"]:v for v in json.load(open(f"{S}/vocabulary.json"))}
man=[l.rstrip('\n').split('\t') for l in open(f"{S}/manifest.tsv") if l.strip()]
order=[m[0] for m in man]

# --- source text, for pulling the passage around each quote -----------------
def flat(p):
    t=open(f"{S}/text/{p}.txt",errors='ignore').read()
    return re.sub(r'\s+',' ',unicodedata.normalize('NFC',t))
SRC={p:flat(p) for p in order}

VOWEL=re.compile(r'[aeiouyAEIOUY]')
RUNHEAD=[
 re.compile(r'(?:Under review as|Published as|Accepted as)[^.]{0,70}?(?:ICLR|NeurIPS|NIPS|ICML|CVPR|ICCV)\s*,?\s*\d{4}\.?',re.I),
 re.compile(r'Proceedings of the[^.]{0,80}?\d{4}\.?',re.I),
 re.compile(r'(?:JMLR|PMLR)\s*:?[^.]{0,50}?volume\s*\d+\.?',re.I),
 re.compile(r'Copyright\s*(?:\(c\)|©)?\s*\d{4}\s*by the author\(s\)\.?',re.I),
 re.compile(r'arXiv:\s*\d{4}\.\d{4,5}(?:v\d+)?\s*\[[^\]]{0,20}\]\s*\d{0,2}\s*\w{0,9}\s*\d{4}',re.I),
]
def descum(t):
    """control bytes, private-use glyphs, running heads, and Caesar-shifted figure labels"""
    if not t: return t
    t=re.sub(r'[\u0000-\u0008\u000b-\u001f\u007f]',' ',t)
    t=re.sub(r'[\ue000-\uf8ff]',' ',t)
    t=re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',' ',t)
    for r in RUNHEAD: t=r.sub(' ',t)
    toks=t.split(' ')
    def letters(w): return re.sub(r'[^A-Za-z]','',w)
    def susp(w):
        c=letters(w)
        if len(c)<4: return False
        if c.isupper(): return True          # long all-caps run = broken CMap
        return not VOWEL.search(c)
    keep=[True]*len(toks)
    n=len(toks); i2=0
    while i2<n:
        if not susp(toks[i2]): i2+=1; continue
        j2=i2; cnt=0
        while j2<n and (susp(toks[j2]) or len(letters(toks[j2]))<=2):
            if susp(toks[j2]): cnt+=1
            j2+=1
        if cnt>=3:
            for k2 in range(i2,j2): keep[k2]=False
        i2=j2 if j2>i2 else i2+1
    t=' '.join(w for w,k in zip(toks,keep) if k)
    return re.sub(r'\s{2,}',' ',t).strip()

def context(pid,q,pad=230):
    hay=SRC[pid]; nq=re.sub(r'\s+',' ',unicodedata.normalize('NFC',q)).strip()
    i=hay.lower().find(nq.lower())
    if i<0: return None
    a=max(0,i-pad); b=min(len(hay),i+len(nq)+pad)
    a2=hay.find(". ",a); a= a2+2 if 0<=a2<i else a
    b2=hay.rfind(". ",i+len(nq),b); b= b2+1 if b2>i else b
    return {"before":descum(hay[a:i]),"hit":descum(hay[i:i+len(nq)]),
            "after":descum(hay[i+len(nq):b])}

# --- method provenance, reflib's vocabulary --------------------------------
for e in G["edges"]:
    e["method"] = "citation" if e["kind"]=="paper-paper" else "genai"

papers={}
for m in man:
    papers[m[0]]=dict(id=m[0],session=int(m[2]),date=m[3],title=m[4],
                      authors=m[5],year=int(m[6]),venue=m[7],
                      evaluation=[],contributions=[])
for pid in order:
    fp=f"{S}/extract/_pending/{pid}.json"
    if os.path.exists(fp):
        d=json.load(open(fp))
        papers[pid]["evaluation"]=d.get("evaluation",[])
        papers[pid]["contributions"]=[p.get("label","") for p in d.get("proposed_concepts",[])]

# --- the self-description: the paper's OWN words, never ours ---------------
PREF=["introduces","motivated-by","extends","replaces","uses"]
for pid in order:
    best=None
    for rel in PREF:
        cands=[e for e in G["edges"] if e["kind"]=="paper-concept"
               and e["from"]==pid and e["rel"]==rel and len(e["quote"])>40]
        if cands:
            best=sorted(cands,key=lambda e:len(e["quote"]))[len(cands)//2]; break
    if best:
        papers[pid]["selfquote"]={"text":best["quote"],"rel":best["rel"],
                                  "concept":best["to"],"context":context(pid,best["quote"])}
    else:
        papers[pid]["selfquote"]=None

# attach context to every edge that has a home paper
for e in G["edges"]:
    if e["kind"]=="paper-concept": e["context"]=context(e["from"],e["quote"])
    elif e["kind"]=="concept-concept": e["context"]=context(e["asserted_by"],e["quote"])

live=set()
for e in G["edges"]:
    if e["kind"]=="paper-concept": live.add(e["to"])
    elif e["kind"]=="concept-concept": live.add(e["from"]); live.add(e["to"])
concepts=[dict(id=c,label=c.replace("-"," "),family=vocab[c]["family"],
               type=vocab[c]["type"],live=(c in live)) for c in vocab]

sess=collections.OrderedDict()
for m in man: sess.setdefault((int(m[2]),m[3]),[]).append(m[0])
sessions=[dict(n=k[0],date=k[1],papers=v) for k,v in sess.items()]

# formal statements, lifted from the papers' own LaTeX source
MATH=[]
mp=f"{S}/math_expanded.json"
if os.path.exists(mp):
    MATH=[m for m in json.load(open(mp))]
AID={}
ap=f"{S}/arxiv_ids.json"
if os.path.exists(ap):
    AID={k:v.get("arxiv") for k,v in json.load(open(ap)).items()}
for pid in order:
    papers[pid]["arxiv"]=AID.get(pid)
    papers[pid]["math"]=[dict(kind=m["kind"],label=m["label"],title=m.get("title"),
                              display=m["display"],html=m.get("html"),
                              render=m.get("render","block"))
                         for m in MATH if m["paper"]==pid]

# --- recommended resources: hand-curated, one row per talk ------------------
RES=[]
rp=f"{S}/resources.json"
if os.path.exists(rp):
    RES=json.load(open(rp))
    known={*order,*(c["id"] for c in concepts)}
    stray=[(r["id"],a) for r in RES for a in r["attaches_to"] if a not in known]
    if stray: sys.exit("resources attach to unknown ids: %r"%stray)

DATA=dict(papers=[papers[p] for p in order],concepts=concepts,math_count=len(MATH),
          edges=G["edges"],sessions=sessions,resources=RES,
          stats=dict(papers=len(order),concepts_total=len(vocab),
                     concepts_live=len(live),edges=len(G["edges"])))
json.dump(DATA,open(f"{R}/data/graph.json","w"),indent=1)
json.dump(RES,open(f"{R}/data/resources.json","w"),indent=1,ensure_ascii=False)
open(f"{R}/assets/data.js","w").write("window.SDL="+json.dumps(DATA,separators=(',',':'))+";\n")
miss=[p for p in order if not papers[p]["selfquote"]]
print("papers %d | concepts %d (%d populated) | edges %d"%(len(order),len(vocab),len(live),len(G["edges"])))
print("papers without a self-quote:", miss or "none")
nc=sum(1 for e in G["edges"] if e.get("context") is None)
print("edges whose surrounding passage could not be located:", nc)
print("recommended resources: %d, on %d of %d papers"%(
    len(RES),sum(1 for p in order if any(p in r["attaches_to"] for r in RES)),len(order)))
print("data.js %.0f KB"%(os.path.getsize(f"{R}/assets/data.js")/1024))
