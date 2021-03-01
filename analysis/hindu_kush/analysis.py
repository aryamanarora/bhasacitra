from scipy.cluster.hierarchy import ward, fcluster
from scipy.spatial.distance import pdist
from scipy.cluster import hierarchy
import matplotlib.pyplot as plt
import csv

data = {}
langs = {}

with open('values.csv', 'r') as fin:
    reader = csv.reader(fin)
    for i, row in enumerate(reader):
        if i == 0: continue
        if row[1] not in data: data[row[1]] = []
        if row[3] == '?': row[3] = 0.5
        data[row[1]].append(row[3])
    
with open('languages.csv', 'r') as fin:
    reader = csv.reader(fin)
    for i, row in enumerate(reader):
        if i == 0: continue
        langs[row[0]] = row[1]

y = pdist(list(data.values()))
a = [langs[x] for x in list(data.keys())]
Z = ward(y)

plt.figure()
dn = hierarchy.dendrogram(Z, labels=a,
                           orientation='right')
hierarchy.set_link_color_palette(['m', 'c', 'y', 'k'])
fig, axes = plt.subplots(1, 2, figsize=(8, 3))
dn1 = hierarchy.dendrogram(Z, ax=axes[0], above_threshold_color='y',
                           orientation='top')
dn2 = hierarchy.dendrogram(Z, ax=axes[1],
                           above_threshold_color='#bcbddc',
                           orientation='right')
hierarchy.set_link_color_palette(None)  # reset to default after use
plt.show()