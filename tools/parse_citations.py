import re,json,unicodedata,os,sys
S=os.path.dirname(os.path.abspath(__file__))
def norm(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode()
    return re.sub(r'[^a-z0-9]','',s.lower())

KEYS={
 'ackley1985':(['learningalgorithmforboltzmannmachines'],'ackley'),
 'hinton2006':(['fastlearningalgorithmfordeepbeliefnets'],'hinton'),
 'hyvarinen2005':(['nonnormalizedstatisticalmodels'],'hyvarinen'),
 'kingma2014':(['autoencodingvariationalbayes'],'kingma'),
 'rezende2015':(['variationalinferencewithnormalizingflows'],'rezende'),
 'vandenoord2016':(['pixelrecurrentneuralnetworks'],'oord'),
 'dinh2015':(['nonlinearindependentcomponentsestimation','nonlinearindependentcomponentestimation'],'dinh'),
 'goodfellow2014':(['generativeadversarialnets','generativeadversarialnetworks'],'goodfellow'),
 'mirza2014':(['conditionalgenerativeadversarialnets'],'mirza'),
 'makhzani2015':(['adversarialautoencoders'],'makhzani'),
 'arjovsky2017':(['wassersteingan'],'arjovsky'),
 'sohldickstein2015':(['nonequilibriumthermodynamics'],'sohl'),
 'song2019':(['estimatinggradientsofthedatadistribution'],'song'),
 'rombach2022':(['highresolutionimagesynthesiswithlatentdiffusion'],'rombach'),
 'tieleman2008':(['approximationstothelikelihoodgradient'],'tieleman'),
 'salakhutdinov2009':(['deepboltzmannmachines'],'salakhutdinov'),
 'vincent2011':(['connectionbetweenscorematching'],'vincent'),
 'burda2016':(['importanceweightedautoencoders'],'burda'),
 'kingma2016':(['inverseautoregressiveflow'],'kingma'),
 'salimans2017':(['discretizedlogisticmixture','pixelcnn'],'salimans'),
 'dinh2017':(['densityestimationusingrealnvp','realnvp'],'dinh'),
 'radford2016':(['deepconvolutionalgenerativeadversarial'],'radford'),
 'isola2017':(['imagetoimagetranslationwithconditional'],'isola'),
 'dumoulin2017':(['adversariallylearnedinference'],'dumoulin'),
 'gulrajani2017':(['improvedtrainingofwassersteingans'],'gulrajani'),
 'ho2020':(['denoisingdiffusionprobabilisticmodels'],'ho'),
 'songsde2021':(['scorebasedgenerativemodelingthroughstochastic'],'song'),
 'peebles2023':(['scalablediffusionmodelswithtransformers'],'peebles'),
}
man=[l.rstrip('\n').split('\t') for l in open(f"{S}/manifest.tsv") if l.strip()]
order=[m[0] for m in man]
year={m[0]:int(m[6]) for m in man}

def refs_of(pid):
    t=open(f"{S}/text/{pid}.txt",errors='ignore').read()
    pat=r'\n\s*(?:[0-9]+\s*\.?\s*)?(?:R\s*E\s*F\s*E\s*R\s*E\s*N\s*C\s*E\s*S|R\s*eferences|References|B\s*I\s*B\s*L\s*I\s*O\s*G\s*R\s*A\s*P\s*H\s*Y|Bibliography)\s*\n'
    m=list(re.finditer(pat,t))
    return t[m[0].end():] if m else ''

edges=[];norefs=[]
for src in order:
    blob=refs_of(src)
    if len(blob)<200: norefs.append(src)
    nb=norm(blob)
    for dst in order:
        if dst==src: continue
        keys,auth=KEYS[dst]
        if not any(k in nb for k in keys): continue
        if norm(auth) not in nb: continue
        if year[dst]>year[src]: continue
        ev=''
        for k in keys:
            i=nb.find(k)
            if i>=0:
                j=max(0,i-140); ev=nb[j:i+len(k)+40]; break
        edges.append({'from':src,'to':dst,'rel':'cites','evidence':ev[-180:]})
json.dump(edges,open(f"{S}/edges_citation.json","w"),indent=1)
print("papers with no parsable reference section:", norefs if norefs else "none")
print("citation edges found:",len(edges))
print()
from collections import Counter
out=Counter(e['from'] for e in edges); inn=Counter(e['to'] for e in edges)
print("most cited within the corpus:")
for pid,c in inn.most_common(10): print("   %-19s %d" % (pid,c))
print()
print("spot-checks that MUST be present:")
for a,b in [('gulrajani2017','arjovsky2017'),('ho2020','sohldickstein2015'),
            ('salimans2017','vandenoord2016'),('burda2016','kingma2014'),
            ('dinh2017','dinh2015'),('songsde2021','song2019'),
            ('song2019','hyvarinen2005'),('vincent2011','hyvarinen2005'),
            ('peebles2023','rombach2022'),('radford2016','goodfellow2014')]:
    ok=any(e['from']==a and e['to']==b for e in edges)
    print(("   OK   " if ok else "   MISS ")+f"{a} -> {b}")
