"""Extract existing generated pixels into registered animation cells for this website.

This does not draw or generate a character. Pillow, NumPy and SciPy are used only
for connected-component extraction, uniform row scaling, alignment and encoding.
"""
from pathlib import Path
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

parser=argparse.ArgumentParser()
parser.add_argument('--sources',type=Path,required=True)
parser.add_argument('--out',type=Path,required=True)
parser.add_argument('--qa',type=Path,required=True)
args=parser.parse_args()
args.out.mkdir(parents=True,exist_ok=True)
args.qa.mkdir(parents=True,exist_ok=True)
CELL_W,CELL_H,BASELINE=384,256,240
source_names={'idle':'idle-strip.png','walk':'walk-right-strip.png','reactions':'reactions-strip.png'}
contact=Image.new('RGB',(CELL_W*6,CELL_H*3+90),'#fbfbfc')
draw=ImageDraw.Draw(contact)
report={}
frames_by_state={}

for row,(state,filename) in enumerate(source_names.items()):
    rgba=np.array(Image.open(args.sources/filename).convert('RGBA'))
    alpha=rgba[:,:,3]
    labels,n=ndimage.label(alpha>24)
    sizes=np.bincount(labels.ravel())
    ids=[i for i in range(1,n+1) if sizes[i]>1500]
    assert len(ids)==6,(state,'Expected exactly six distinct poses',len(ids))
    boxes=ndimage.find_objects(labels)
    ids.sort(key=lambda i:boxes[i-1][1].start)
    # Every faint edge remains attached to its nearest original solid pose.
    major=np.isin(labels,ids)
    distance,nearest=ndimage.distance_transform_edt(~major,return_indices=True)
    owner=labels[nearest[0],nearest[1]]
    groups=[]
    for component in ids:
        mask=(owner==component)&(alpha>3)&(distance<=5)
        yy,xx=np.nonzero(mask)
        x0,y0,x1,y1=int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
        # Anchor on the upper body so tail and foot motion does not move the torso.
        upper=mask.copy();upper[int(y0+(y1-y0)*.76):,:]=False
        uy,ux=np.nonzero(upper)
        anchor=float(np.average(ux,weights=alpha[uy,ux]))
        groups.append({'id':component,'mask':mask,'box':[x0,y0,x1,y1],'anchor':anchor})
    top=min(g['box'][1] for g in groups)-4
    bottom=max(g['box'][3] for g in groups)+4
    left_extent=max(g['anchor']-g['box'][0]+4 for g in groups)
    right_extent=max(g['box'][2]-g['anchor']+4 for g in groups)
    scale=min(216/(bottom-top),174/left_extent,174/right_extent)
    atlas=Image.new('RGBA',(CELL_W*6,CELL_H))
    frames=[];frame_report=[]
    for index,g in enumerate(groups):
        x0=max(0,g['box'][0]-4);x1=min(rgba.shape[1],g['box'][2]+4)
        piece=rgba[top:bottom,x0:x1].copy()
        mask=g['mask'][top:bottom,x0:x1]
        piece[:,:,3]=np.where(mask,piece[:,:,3],0)
        piece[piece[:,:,3]==0,:3]=0
        raw=Image.fromarray(piece)
        size=(round(raw.width*scale),round(raw.height*scale))
        scaled=raw.resize(size,Image.Resampling.LANCZOS)
        x=round(CELL_W/2-(g['anchor']-x0)*scale)
        y=BASELINE-size[1]
        assert x>=0 and x+size[0]<=CELL_W and y>=0,(state,index,'frame clip')
        frame=Image.new('RGBA',(CELL_W,CELL_H))
        frame.alpha_composite(scaled,(x,y))
        frames.append(frame)
        atlas.alpha_composite(frame,(CELL_W*index,0))
        contact.paste(frame,(CELL_W*index,row*(CELL_H+30)+25),frame)
        draw.text((CELL_W*index+15,row*(CELL_H+30)+7),f'{state} / {index+1}',fill='#626b7e')
        bounds=frame.getbbox()
        assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<CELL_W and bounds[3]<CELL_H
        frame_report.append({'source_bounds':g['box'],'anchor_x':round(g['anchor'],2),'output_bounds':bounds})
    atlas.save(args.out/(state+'.webp'),format='WEBP',lossless=True,method=6)
    assert Image.open(args.out/(state+'.webp')).size==(CELL_W*6,CELL_H)
    frames_by_state[state]=frames
    report[state]={'frames':6,'cell':[CELL_W,CELL_H],'shared_scale':scale,'baseline':BASELINE,'details':frame_report,'bytes':(args.out/(state+'.webp')).stat().st_size}

contact.save(args.qa/'contact-sheet.png')
preview=[];duration=[]
for state,sequence,ms in [('idle',[0,1,2,3,4,5],220),('walk',list(range(6))*3,100),('reactions',list(range(6)),550)]:
    for index in sequence:
        frame=Image.new('RGB',(CELL_W,CELL_H),'#fbfbfc')
        frame.paste(frames_by_state[state][index],(0,0),frames_by_state[state][index])
        preview.append(frame);duration.append(ms)
preview[0].save(args.qa/'motion-preview.gif',save_all=True,append_images=preview[1:],duration=duration,loop=0,disposal=2)
(args.out/'manifest.json').write_text(json.dumps({'version':1,'cellWidth':CELL_W,'cellHeight':CELL_H,'frameCount':6,'states':list(source_names),'source':'Original image-generated golden cat frames'},indent=2))
(args.qa/'asset-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps({state:{'frames':v['frames'],'cell':v['cell'],'bytes':v['bytes']} for state,v in report.items()}))
