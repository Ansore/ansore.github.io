#!/bin/bash
git checkout hexo

hexo clean
hexo g
gulp
hexo d

git add .
git commit -m "backup"
git push origin hexo
