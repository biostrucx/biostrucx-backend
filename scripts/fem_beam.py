#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera un modelo FEM de viga simplemente apoyada con carga distribuida,
resuelve con OpenSeesPy y devuelve JSON con:
- viz.vertices: [x,y,z,...]
- viz.indices:  [i,j,k,...]  (triángulos)
- viz.u_mag:    [u_mm por vértice]
- midspan_mm:   deflexión en el centro (mm)
"""

import json, math, sys
from datetime import datetime

# ---- Parámetros (puedes leerlos por argv/env si quieres) ----
L  = 25.0   # m  largo
B  = 0.25   # m  ancho (para el ribbon de visualización)
H  = 1.00   # m  alto
E  = 30e9   # Pa hormigón ~30 GPa
rho= 2500.0 # kg/m3 (no usamos en estático)
q  = 15e3   # N/m carga distribuida (p.ej. 15 kN/m)
N  = 40     # divisiones (nodos = N+1)

# ---- FEM con OpenSeesPy (2D frame) ----
try:
    import openseespy.opensees as ops
except Exception as e:
    # Fallback analítico si no logra importar OpenSeesPy
    # y construimos malla y colores con fórmula de viga simplemente apoyada
    # y(x) = (q x (L^3 - 2Lx^2 + x^3))/(24 E I)
    I = (B * H**3) / 12.0
    xs = [i*L/N for i in range(N+1)]
    u  = []
    for x in xs:
        y = (q * x * (L**3 - 2*L*x**2 + x**3)) / (24.0 * E * I)
        u.append(y)  # m
    midspan_mm = 1000.0 * (q * (L/2) * (L**3 - 2*L*(L/2)**2 + (L/2)**3) / (24.0*E*I))
    # malla "ribbon": dos vértices por nodo
    vertices = []
    u_mag = []
    halfW = B * 0.2
    for i,x in enumerate(xs):
        # dos vértices por estación
        vertices += [x, 0.0, 0.0,   x, halfW, 0.0]
        u_mm = 1000.0 * u[i]
        u_mag += [u_mm, u_mm]

    # triángulos
    indices = []
    for i in range(N):
        a = 2*i; b = 2*i+1; c = 2*(i+1); d = 2*(i+1)+1
        indices += [a,b,d,  a,d,c]

    out = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "status": "done",
        "params": {"desc": "viga 25x25x1 m (fallback analítico)"},
        "model": {"type": "beam", "dims": {"L": L, "B": B, "H": H}},
        "viz": {"vertices": vertices, "indices": indices, "u_mag": u_mag},
        "midspan_mm": midspan_mm
    }
    print(json.dumps(out))
    sys.exit(0)

# --- OpenSeesPy solve ---
ops.wipe()
ops.model('basic','-ndm',2,'-ndf',3)

# Nodos
for i in range(N+1):
    x = i*L/N
    ops.node(i+1, x, 0.0)

# Apoyos simples: extremos con uy,rz fijos (liberamos ux para no sobre-restringir)
ops.fix(1, 0, 1, 1)        # nodo 1: uy,rz fijos
ops.fix(N+1, 0, 1, 0)      # nodo N+1: uy fijo

A = B*H
I = (B * H**3)/12.0
ops.uniaxialMaterial('Elastic', 1, E)
ops.section('Elastic', 1, E, A, I)
ops.geomTransf('Linear', 1)
# Elementos
for i in range(N):
    ops.element('elasticBeamColumn', i+1, i+1, i+2, A, E, I, 1)

# Carga distribuida (down)
ops.timeSeries('Linear', 1)
ops.pattern('Plain', 1, 1)
for i in range(N):
    ops.eleLoad('-ele', i+1, '-type', '-beamUniform', -q)  # -q en Y

ops.system('BandGeneral')
ops.numberer('RCM')
ops.constraints('Plain')
ops.integrator('LoadControl', 1.0)
ops.algorithm('Linear')
ops.analysis('Static')
ops.analyze(1)

# Obtener desplazamientos
u = []
for i in range(N+1):
    uy = ops.nodeDisp(i+1, 2)  # m
    u.append(uy)

midspan_mm = 1000.0 * u[N//2]

# Malla "ribbon" para visualizar
vertices = []
u_mag = []
halfW = B * 0.2
for i in range(N+1):
    x = i*L/N
    vertices += [x, 0.0, 0.0,   x, halfW, 0.0]
    u_mm = 1000.0 * u[i]
    u_mag += [u_mm, u_mm]

indices = []
for i in range(N):
    a = 2*i; b = 2*i+1; c = 2*(i+1); d = 2*(i+1)+1
    indices += [a,b,d,  a,d,c]

out = {
    "ts": datetime.utcnow().isoformat() + "Z",
    "status": "done",
    "params": {"desc": "viga 25x25x1 m (OpenSeesPy)"},
    "model": {"type": "beam", "dims": {"L": L, "B": B, "H": H}},
    "viz": {"vertices": vertices, "indices": indices, "u_mag": u_mag},
    "midspan_mm": midspan_mm
}
print(json.dumps(out))
