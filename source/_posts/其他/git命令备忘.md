---
title: git命令备忘
tags:
  - git
categories:
  - 编程
cover: https://img.ansore.de/2022/04/26/626812e016480.jpg
abbrlink: 3b2f1e44
date: 2017-07-28 20:09:18
---

#### 基本配置

```
git config --global user.name
git config --global user.email
```

#### 创建本地仓库

```
git init
```

#### 获取远程仓库

```
git clone <url>
```



#### 创建远程仓库

```
# 添加新的远程仓库
git remote add <name> <url>

# 查看所有remote
git remote [-v]

# 删除remote
git remote rm <name>

# 重命名 remote
git remote rename <old> <new>
```

#### 分支

```
# 列出分支
git branch

# 创建新分支
git branch <branch-name>

# 删除分支
git branch -d <branch-name>

# 删除remote分支
git push --delete <remote-name> <remote-branch>
git push <remote-name> :<remote-branch>

# 切换到另一个分支
git checkout <branch-name>

# 创建并切换到该分支
git checkout -b <branch-name>

# 合并某分支到当前分支
git merge <branch-name>
```

#### 工作区和暂存区

```
# 添加所有文件 
git add .
git add -A

# 添加指定文件
git add <file-name>

# 提交，将暂存区内容提交到当前分支上
git commit -m "注释"

```



#### 撤销

```
# 撤销最近一个提交
git revert HEAD

# 取消 commit + add
git reset --mixed

# 取消 commit
git reset --soft

# 取消 commit + add + local working
git reset --hard
```

#### 提交到远程服务器

```
git push <remote-name> <local-branch>:<remote-branch>
```

#### 查看状态

```
git status
```

#### 从远程下载新的改动

```
git pull

git pull <remote-name> <branch>
```

