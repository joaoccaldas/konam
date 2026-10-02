"""Photo-aligned meshes; geometry remains editable in Blender, metres / Z-up."""
import bpy, bmesh, os, json
from mathutils import Vector
from lib import mesh, join_geo, box, WORLD
import frame
HERE=os.path.dirname(__file__)
DATA=os.environ.get('BIKE_PROFILE_DIR', os.path.join(HERE,'data'))

def load_obj(name):
    verts, faces=[],[]
    with open(os.path.join(DATA,name+'.obj')) as f:
        for line in f:
            t=line.split()
            if t and t[0]=='v': verts.append(Vector(tuple(map(float,t[1:4]))))
            elif t and t[0]=='f': faces.append([int(i.split('/')[0])-1 for i in t[1:]])
    return verts,faces

def build_frame(M):
    v,f,_=join_geo([load_obj('frame_main'),load_obj('frame_stays')])
    return mesh('frame_raw',v,f,M['paint'])

def build_fork_raw(M):
    v,f=load_obj('fork')
    # Crown joins the separated blades above the front tyre. Hidden depth is estimated.
    from lib import sweep, kamm
    crown=sweep([Vector((498,y,690))*.001 for y in (-64,-55,0,55,64)], [kamm(76,22,trunc=.94,le=1)]*5,lat=Vector((0,0,1)))
    v,f,_=join_geo([(v,f),crown])
    return mesh('fork_raw',v,f,M['paint'])


def fork_steerer():
    from lib import tube
    return tube(frame.W(frame.steer_at_z(694)),frame.W(frame.steer_at_z(753)),14.3,14.3,24)
