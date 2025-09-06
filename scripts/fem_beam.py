# scripts/fem_beam.py
# Genera una viga simplemente apoyada con carga distribuida (analítico Euler-Bernoulli)
# y devuelve un dict listo para guardar en Mongo con el shape correcto.

from math import sqrt
from datetime import datetime
import os

def build_beam_viz(
    L=25.0,            # largo (m)
    B=1.0,             # ancho visual de la “cinta” (m)
    H=1.0,             # alto (solo para I)
    E=2.1e11,          # Pa (acero)
    rho=7850,          # kg/m3 (no usado aquí)
    w=15000.0,         # N/m (15 kN/m)
    nx=40              # columnas (nx+1 nodos en X)
):
    """
    Devuelve:
      vertices: [x,y,z, x,y,z, ...]            (len % 3 == 0)
      indices:  [i0,i1,i2, i0,i2,i3, ...]      (len % 3 == 0)
      u_mag:    [|u| por vértice]              (len == n_vertices)
      marker:   [x,y,z]                        (opcional)
    """

    # Inercia rectangular (aprox): I = b*h^3/12
    # Usamos H como “altura” y B no afecta a I (solo visual)
    I = (B * (H ** 3)) / 12.0

    # Fórmula deflexión viga simplemente apoyada, carga uniforme:
    # u(x) = w * x * (L**3 - 2*L*x**2 + x**3) / (24*E*I)
    def u_defl(x):
        return (w * x * (L**3 - 2*L*(x**2) + (x**3))) / (24.0 * E * I)

    # Mallado “cinta”: 2 filas (z = -B/2 y z = +B/2), nx+1 columnas
    zs = [-B/2.0, +B/2.0]
    xs = [L * i / nx for i in range(nx + 1)]

    vertices = []
    u_mag = []

    # Construimos nodos (x, u(x), z)
    for x in xs:
        disp = u_defl(x)          # en metros
        for z in zs:
            vertices.extend([x, disp, z])   # x, y(=disp), z
            u_mag.append(abs(disp))

    # Triangulación (grid 2x(nx+1) → nx “cuads” → 2*nx triángulos)
    # Indexado por columna i y fila j (j=0 ó 1):
    # idx(i,j) = i*2 + j
    def vid(i, j):
        return i * 2 + j

    indices = []
    for i in range(nx):
        # cuatro vértices del quad
        v00 = vid(i, 0)
        v01 = vid(i, 1)
        v10 = vid(i+1, 0)
        v11 = vid(i+1, 1)
        # dos triángulos
        indices += [v00, v10, v11,  v00, v11, v01]

    # Validaciones de shape
    assert len(vertices) % 3 == 0, "vertices debe ser múltiplo de 3"
    assert len(indices)  % 3 == 0, "indices debe ser múltiplo de 3"
    assert len(u_mag) == len(vertices)//3, "u_mag debe tener N_vértices"

    # Marcador en la mitad
    x_mid = L/2.0
    y_mid = u_defl(x_mid)
    marker = [x_mid, y_mid, 0.0]

    return {
        "vertices": vertices,
        "indices": indices,
        "u_mag": u_mag,
        "marker": marker
    }

if __name__ == "__main__":
    # Solo para prueba local
    viz = build_beam_viz()
    print("n_vertices:", len(viz["vertices"])//3)
    print("n_tris:", len(viz["indices"])//3)

