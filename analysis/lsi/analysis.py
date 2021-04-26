import csv
import io
import urllib.request

from scipy.cluster.hierarchy import ward, fcluster
from scipy.spatial.distance import pdist
from scipy.cluster import hierarchy
import matplotlib.pyplot as plt
import numpy as np

data = {}

for i in range(1, 73):
    print(i)
    url = f"http://demo.spraakdata.gu.se/lsi/clld/values.csv?parameter={i}"
    webpage = urllib.request.urlopen(url)
    reader = csv.reader(io.TextIOWrapper(webpage))
    for j, row in enumerate(reader):
        print(row)
        if j == 0: continue
        lang = ' '.join(row[7].split('-')[1:])
        val = row[4]
        if lang not in data: data[lang] = []
        data[lang].append(val)



# print(data)
# y = pdist(list(data.values()))
# Z = ward(y)

# plt.figure(figsize=(15.0, 18.0))
# dn = hierarchy.dendrogram(Z, labels=list(data.keys()), orientation='left')
# plt.savefig("dendogram.pgf")
# plt.show()