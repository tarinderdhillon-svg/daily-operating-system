#!/bin/bash

# Fix tasks.ts
sed -i '' 's/const NOTION_API_KEY = "ntn_[^"]*"/const NOTION_API_KEY = process.env.NOTION_API_KEY || ""/g' artifacts/api-server/src/routes/tasks.ts
sed -i '' 's/const NOTION_DB_ID   = "[^"]*"/const NOTION_DB_ID   = process.env.TASKS_PAGE_ID || ""/g' artifacts/api-server/src/routes/tasks.ts
sed -i '' 's/const NOTION_PROJECTS_DB = "[^"]*"/const NOTION_PROJECTS_DB = process.env.PROJECTS_PAGE_ID || ""/g' artifacts/api-server/src/routes/tasks.ts

# Fix chat.ts
sed -i '' 's/const NOTION_API_KEY = "ntn_[^"]*"/const NOTION_API_KEY = process.env.NOTION_API_KEY || ""/g' artifacts/api-server/src/routes/chat.ts
sed -i '' 's/const NOTION_DB_ID   = "[^"]*"/const NOTION_DB_ID   = process.env.TASKS_PAGE_ID || ""/g' artifacts/api-server/src/routes/chat.ts

# Fix learning.ts
sed -i '' 's/const NOTION_API_KEY = "ntn_[^"]*"/const NOTION_API_KEY = process.env.NOTION_API_KEY || ""/g' artifacts/api-server/src/routes/learning.ts
sed -i '' 's/const NOTION_DB_ID   = "[^"]*"/const NOTION_DB_ID   = process.env.TASKS_PAGE_ID || ""/g' artifacts/api-server/src/routes/learning.ts

echo "Secrets replaced in all files"
