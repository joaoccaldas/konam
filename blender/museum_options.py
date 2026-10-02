"""Optional native Blender disc and rider meshes; excluded from the stock GLB/LODs."""
import bpy,math,json,os
from mathutils import Vector
from lib import mesh,lathe,mat
import frame as FR

def build(M):
    col=bpy.data.collections.new('OPTIONS • rear disc and fit mannequin');bpy.context.scene.collection.children.link(col)
    def optional(o):
        for c in list(o.users_collection):c.objects.unlink(o)
        col.objects.link(o);o['optional_geometry']=True;o['optional_accessory']=True
        o.hide_render=True;o.hide_set(True);return o
    # Generic carbon cover matched to this rim; not a manufacturer's internal construction.
    prof=[(18,11),(70,10),(150,8),(239,3.5),(239,-3.5),(150,-10),(70,-17),(18,-19)]
    v,f,u=lathe(prof,128,FR.AX_R,closed_prof=True)
    disc=mesh('OPTION • rear disc cover',v,f,M['carbon'],parent=bpy.data.objects['wheel_rear'],origin=FR.AX_R*.001,smooth=True)
    optional(disc);disc['instructions']='Show this mesh and hide spokes_rear; keep the original rim, tyre, cassette and rotor. Representative cover geometry.'
    from avatar_asset import build as build_avatar
    build_avatar(col)
    bpy.context.scene['optional_assets']='Hidden optional disc and articulated CC0 human. Stock web GLB excludes these; the viewer creates runtime options.'
