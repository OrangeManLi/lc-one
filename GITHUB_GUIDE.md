# GitHub 提交指南

## 方法一：通过命令行（推荐）

### 1. 初始化Git仓库
```bash
cd tech-blog-project
git init
```

### 2. 添加所有文件
```bash
git add .
```

### 3. 创建第一次提交
```bash
git commit -m "Initial commit: Add 3D bear tech blog"
```

### 4. 在GitHub上创建新仓库
1. 访问 https://github.com/new
2. 仓库名称：`tech-blog` 或其他你喜欢的名字
3. 选择 Public 或 Private
4. **不要**勾选 "Initialize this repository with a README"
5. 点击 "Create repository"

### 5. 连接远程仓库并推送
```bash
# 替换 YOUR_USERNAME 和 YOUR_REPO_NAME
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 6. 启用GitHub Pages（可选）
1. 进入仓库设置: Settings > Pages
2. Source 选择: Deploy from a branch
3. Branch 选择: main / (root)
4. 点击 Save
5. 等待几分钟后，访问 https://YOUR_USERNAME.github.io/YOUR_REPO_NAME

---

## 方法二：通过GitHub Desktop（图形界面）

### 1. 下载并安装GitHub Desktop
访问: https://desktop.github.com/

### 2. 登录你的GitHub账户

### 3. 添加本地仓库
- File > Add Local Repository
- 选择 `tech-blog-project` 文件夹

### 4. 创建初始提交
- 在左侧填写提交信息: "Initial commit: Add 3D bear tech blog"
- 点击 "Commit to main"

### 5. 发布到GitHub
- 点击顶部的 "Publish repository"
- 输入仓库名称和描述
- 选择 Public 或 Private
- 点击 "Publish repository"

---

## 方法三：直接上传到GitHub网页

### 1. 在GitHub创建新仓库
访问: https://github.com/new

### 2. 上传文件
1. 进入新创建的仓库
2. 点击 "uploading an existing file"
3. 将 `tech-blog-project` 文件夹中的所有文件拖拽到页面
4. 填写提交信息
5. 点击 "Commit changes"

---

## 常用Git命令

### 查看状态
```bash
git status
```

### 添加修改
```bash
git add .
```

### 提交修改
```bash
git commit -m "描述你的修改"
```

### 推送到GitHub
```bash
git push
```

### 拉取最新代码
```bash
git pull
```

---

## 故障排除

### 问题：git command not found
**解决方案**: 安装Git
- Windows: https://git-scm.com/download/win
- macOS: `brew install git` 或从 https://git-scm.com/download/mac
- Linux: `sudo apt-get install git` 或 `sudo yum install git`

### 问题：Permission denied (publickey)
**解决方案**: 使用HTTPS而不是SSH
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### 问题：需要输入用户名密码
**解决方案**: 使用Personal Access Token
1. 访问 https://github.com/settings/tokens
2. 生成新token (Generate new token - classic)
3. 选择 `repo` 权限
4. 复制token
5. 在推送时使用token作为密码

---

## 下一步

提交成功后，你可以：
1. ✅ 启用GitHub Pages发布网站
2. ✅ 修改README.md添加项目截图
3. ✅ 添加LICENSE文件
4. ✅ 邀请其他人协作
5. ✅ 设置GitHub Actions自动部署

祝你使用愉快！🎉
