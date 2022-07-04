# Development Environment Suggestions

## Configure Application Runtime Options

We use `.env` to manage runtime options. Default options are being shipped as `.env` in the project root directory.

Vite supports multi-level `.env` files, you can check out how it works here: https://vitejs.dev/guide/env-and-mode.html.

## Editors / IDEs

Workspace in Magicbroad includes multiple programming languages, file formats and tools. It's recommended to have your editors' or IDEs' support for them:

- TypeScript (including `.tsx`) and JavaScript
- ESLint
- Stylus
- EditorConfig
- Git (`.gitignore`, `.gitattribute`)
- YAML
- Markdown
- JSON
- TOML (Supabase local deployment uses a TOML file for configuration)
- SQL (Supabase database migration)

### Visual Studio Code

VS Code has built-in support for TypeScript and JavaScript.

Recommended extensions:
- [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) for editor config support
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for ESLint integration
- [stylus](https://marketplace.visualstudio.com/items?itemName=sysoev.language-stylus) for stylus support

It's also recommended to install extensions for:
- YAML support
- TOML support
- SQL support
