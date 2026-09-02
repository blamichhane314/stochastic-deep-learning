import json,re,os,sys,unicodedata,collections
S=os.path.dirname(os.path.abspath(__file__))
def nz(s): return re.sub(r'\s+',' ',unicodedata.normalize('NFC',s)).strip()
def nzl(s): return nz(s).lower()

man=[l.rstrip('\n').split('\t') for l in open(f"{S}/manifest.tsv") if l.strip()]
papers={m[0]:{"id":m[0],"session":int(m[2]),"date":m[3],"title":m[4],
              "authors":m[5],"year":int(m[6]),"venue":m[7]} for m in man}
order=[m[0] for m in man]
vocab={v["id"]:v for v in json.load(open(f"{S}/vocabulary.json"))}
P2C={"introduces","uses","extends","replaces","motivated-by","evaluates-with","acknowledges-limitation"}
C2C={"equivalent-to","special-case-of","generalizes","prerequisite-for","dual-to"}

src={}
for pid in order:
    src[pid]=nzl(open(f"{S}/text/{pid}.txt",errors='ignore').read())

edges=[];drops=[];proposed=[];missing=[];eid=0
for pid in order:
    fp=f"{S}/extract/_pending/{pid}.json"
    if not os.path.exists(fp): missing.append(pid); continue
    try: d=json.load(open(fp))
    except Exception as e: drops.append((pid,"BADJSON",str(e)[:60])); continue
    papers[pid]["one_line"]=nz(d.get("one_line",""))
    papers[pid]["summary"]=nz(d.get("summary",""))
    papers[pid]["evaluation"]=d.get("evaluation",[])
    for c in d.get("concepts",[]):
        cid,rel,q=c.get("concept_id"),c.get("relation"),c.get("quote","")
        if cid not in vocab: drops.append((pid,"BADCONCEPT",str(cid))); continue
        if rel not in P2C:  drops.append((pid,"BADREL",str(rel)));    continue
        if nzl(q) not in src[pid]: drops.append((pid,"QUOTEFAIL",cid+" :: "+nz(q)[:70])); continue
        eid+=1
        edges.append({"id":f"e{eid}","from":pid,"to":cid,"kind":"paper-concept",
                      "rel":rel,"quote":nz(q),"note":nz(c.get("note",""))})
    for c in d.get("concept_relations",[]):
        a,b,rel,q=c.get("from"),c.get("to"),c.get("relation"),c.get("quote","")
        if a not in vocab or b not in vocab: drops.append((pid,"BADCONCEPT",f"{a}->{b}")); continue
        if rel not in C2C: drops.append((pid,"BADREL",str(rel))); continue
        if nzl(q) not in src[pid]: drops.append((pid,"QUOTEFAIL",f"{a}->{b} :: "+nz(q)[:60])); continue
        eid+=1
        edges.append({"id":f"e{eid}","from":a,"to":b,"kind":"concept-concept",
                      "rel":rel,"quote":nz(q),"note":nz(c.get("note","")),"asserted_by":pid})
    for p in d.get("proposed_concepts",[]):
        proposed.append({"paper":pid,"label":nz(p.get("label","")),"why":nz(p.get("why",""))})

cit=json.load(open(f"{S}/edges_citation.json"))
for c in cit:
    eid+=1
    edges.append({"id":f"e{eid}","from":c["from"],"to":c["to"],"kind":"paper-paper",
                  "rel":"cites","quote":c.get("evidence","")[:180]})

nodes=[{"id":p,"type":"paper",**{k:v for k,v in papers[p].items() if k!="id"}} for p in order]
used={e["to"] for e in edges if e["kind"]=="paper-concept"}|{e["from"] for e in edges if e["kind"]=="concept-concept"}|{e["to"] for e in edges if e["kind"]=="concept-concept"}
for cid,v in vocab.items():
    nodes.append({"id":cid,"type":v["type"],"family":v["family"],"label":cid.replace("-"," ")})
json.dump({"nodes":nodes,"edges":edges},open(f"{S}/graph.json","w"),indent=1)
json.dump(proposed,open(f"{S}/proposed.json","w"),indent=1)

print("MERGE REPORT")
print("  extractions found : %d of 28%s"%(28-len(missing)," (missing: "+",".join(missing)+")" if missing else ""))
print("  paper-concept     : %d"%sum(1 for e in edges if e["kind"]=="paper-concept"))
print("  concept-concept   : %d"%sum(1 for e in edges if e["kind"]=="concept-concept"))
print("  citation          : %d"%sum(1 for e in edges if e["kind"]=="paper-paper"))
print("  DROPPED           : %d"%len(drops))
byk=collections.Counter(d[1] for d in drops)
for k,v in byk.most_common(): print("      %-12s %d"%(k,v))
for d in drops[:12]: print("      %s | %s | %s"%d)
print()
df=collections.Counter(e["to"] for e in edges if e["kind"]=="paper-concept")
print("  concepts with 0 edges (cut candidates): %d"%sum(1 for c in vocab if df[c]==0))
print("      "+", ".join(sorted(c for c in vocab if df[c]==0)) or "none")
print()
print("  TRUE document frequency, top 12:")
for c,n in df.most_common(12): print("      %2d  %s"%(n,c))
print()
print("  proposed concepts, grouped:")
g=collections.Counter(nzl(p["label"]) for p in proposed)
for lab,n in g.most_common():
    if n>1: print("      x%d  %s"%(n,lab))
print("      (%d proposals, %d distinct)"%(len(proposed),len(g)))
