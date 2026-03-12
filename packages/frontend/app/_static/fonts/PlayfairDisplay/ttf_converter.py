#!/usr/bin/python
import os, fontforge

abspath = os.path.abspath(__file__)
dname = os.path.dirname(abspath)
os.chdir(dname)

path = os.getcwd()
fileList = os.listdir(path)
extensions = ['.woff', '.woff2']

for item in fileList:
    if "variable" in item.lower():
        continue
    if item[-4::] == '.ttf':
        font = fontforge.open(item)
        filename = item[0:-4:]
        for extension in extensions:
            font.generate(filename + extension)
