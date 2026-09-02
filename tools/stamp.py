"""Stamp local asset URLs with a content hash so browsers never serve a stale file."""
import glob,hashlib,os,re,sys
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def h(rel):
    p=os.path.join(R,rel)
    if not os.path.exists(p): return None
    return hashlib.sha1(open(p,'rb').read()).hexdigest()[:8]
pat=re.compile(r'((?:src|href)=")(assets/[A-Za-z0-9_./-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?(")')
n=0
for f in glob.glob(os.path.join(R,"*.html")):
    s=open(f).read()
    def sub(m):
        v=h(m.group(2))
        return m.group(1)+m.group(2)+(("?v="+v) if v else "")+m.group(3)
    out=pat.sub(sub,s)
    if out!=s: open(f,"w").write(out); 
    n+=1
print("stamped %d pages"%n)
