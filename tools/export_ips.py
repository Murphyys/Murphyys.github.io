"""Regenerate data/ips.json for the Thesis dialog demo (ips3d.js).

Runs the thesis notebook's own code — cells 1 (paths), 3 (DC-HKNN) and 7 (standard KNN) of
github.com/Murphyys/DC-HKNN-Indoor-Positioning/All_Algorithm.ipynb — on its public CSVs, with two pins so the
result matches the published run:
  * DC-HKNN hyper-parameters fixed to the published best config (K_FLOOR 1, K_POS 16, RADIUS 35, CONF 1.0)
    instead of re-running the grid search, and
  * NearestNeighbors(algorithm="kd_tree"): the data has many identical RSSI fingerprints, so neighbours tie and
    the tie order depends on the search algorithm / scikit-learn version. kd_tree gives 2.226 m (published 2.225 m);
    brute 2.233 m, ball_tree 2.256 m. Ice chose the kd_tree run on 2026-10-15.

Usage (from the repo root):
    uv run --no-project --with pandas --with numpy --with scikit-learn --with scipy --with openpyxl \
        python tools/export_ips.py <checkout of DC-HKNN-Indoor-Positioning> data/ips.json
"""
import contextlib, io, json, os, re, sys, types
import numpy as np, pandas as pd

repo, dst = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
nb = json.load(open(os.path.join(repo, 'All_Algorithm.ipynb'), encoding='utf-8'))
cell = lambda i: ''.join(nb['cells'][i]['source'])
dc_src = cell(3)
for name, val in (('K_FLOOR_LIST', '[1]'), ('K_POS_LIST', '[16]'), ('RADIUS_LIST', '[35]'), ('CONF_LIST', '[1.00]')):
    dc_src, n = re.subn(rf'^{name}\s*=.*$', f'{name} = {val}', dc_src, flags=re.M); assert n == 1, name
dc_src, n = re.subn(r'metric="euclidean"\)', 'metric="euclidean", algorithm="kd_tree")', dc_src); assert n >= 3

# the notebook imports IPython.display; nothing is displayed in these cells, so a stub is enough
ipd = types.ModuleType('IPython.display'); ipd.display = print
sys.modules['IPython'] = types.ModuleType('IPython'); sys.modules['IPython.display'] = ipd
os.chdir(repo)   # the notebook uses relative Data/ and result/ paths
ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(cell(1), ns); exec(dc_src, ns)
    dc, dc_mde, dc_floor, dc_cov = ns['df_results'].copy(), ns['mde_final'], ns['final_floor_acc'], ns['final_coverage']
    exec(cell(7), ns)
    knn_pred, knn_mde, knn_floor = ns['y_pred_target'], ns['mde_final'], ns['floor_accuracy']
print(f'DC-HKNN {dc_mde:.3f} m (published 2.225) · KNN {knn_mde:.3f} m (published 3.814)')
assert abs(dc_mde - 2.225) < .002 and round(knn_mde, 3) == 3.814, 'result drifted from the published run — stop and check'

train, test = pd.read_csv('Data/Train_Data_1.csv'), pd.read_csv('Data/Test_Data_1.csv')
rssi = [f'RSSI{i}' for i in range(1, 19)]
rp = train[['X', 'Y', 'Z']].drop_duplicates().sort_values(['Z', 'Y', 'X']).values.tolist()

# AP positions are not in the dataset: estimate each as the power-weighted centroid of its 8 strongest mean readings,
# on the floor where it is heard strongest (100 = not heard)
mean = train.replace({c: {100: np.nan} for c in rssi}).groupby(['X', 'Y', 'Z'])[rssi].mean().reset_index()
aps = []
for c in rssi:
    s = mean[['X', 'Y', 'Z', c]].dropna().sort_values(c, ascending=False)
    if s.empty: aps.append(None); continue
    f = int(s.iloc[0]['Z']); top = s[s['Z'] == f].head(8); w = 10 ** (top[c] / 10)
    aps.append([round(float((top['X'] * w).sum() / w.sum()), 2), round(float((top['Y'] * w).sum() / w.sum()), 2), f])
heat = [[None if pd.isna(v) else round(float(v), 1) for v in row]
        for row in mean.set_index(['X', 'Y', 'Z']).reindex([tuple(r) for r in rp])[rssi].values]

r2 = lambda v: None if v is None or (isinstance(v, float) and np.isnan(v)) else round(float(v), 2)
dirs = {'North': 'N', 'East': 'E', 'South': 'S', 'West': 'W'}
samples = [[float(r.X), float(r.Y), int(r.Z), dirs[r.Direction], r2(dc.iloc[i].Pred_X), r2(dc.iloc[i].Pred_Y),
            int(dc.iloc[i].Pred_Z), r2(knn_pred[i][0]), r2(knn_pred[i][1])] for i, r in test.iterrows()]

out = {
    'source': 'github.com/Murphyys/DC-HKNN-Indoor-Positioning (Train_Data_1 / Test_Data_1, notebook cells 3 and 7)',
    'search': 'kd_tree, published config 1/16/35/1.0 (MDE 2.226 vs published 2.225; neighbour ties)',
    'units': 'metres; grid 1.2 m; floors 0 and 1',
    'rp': rp, 'ap': aps, 'apApprox': True, 'heat': heat, 'test': samples,
    'testFields': ['x', 'y', 'floor', 'dir', 'dcX', 'dcY', 'dcFloor', 'knnX', 'knnY'],
    'stats': {'dc': {'mde': round(dc_mde, 3), 'floor': round(dc_floor * 100, 2), 'coverage': round(dc_cov * 100, 2)},
              'knn': {'mde': round(knn_mde, 3), 'floor': round(knn_floor, 2)}},
}
json.dump(out, open(dst, 'w', encoding='utf-8'), separators=(',', ':'))
print('wrote', dst, os.path.getsize(dst), 'bytes')
