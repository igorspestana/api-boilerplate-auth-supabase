# Project Rules – Boilerplate API

Este diretório contém arquivos `.mdc` com as convenções e padrões de desenvolvimento adotados no projeto **API Boilerplate**. Eles são utilizados pelo editor **[Cursor](https://cursor.sh)** para guiar, sugerir e corrigir o código automaticamente com base em boas práticas.

## Estrutura dos Arquivos

- `node-rules.mdc`  
  Regras para o API Node.js.

## Como Usar no Cursor

1. **Instale o Cursor** (caso ainda não tenha):
   - https://cursor.sh

2. **Coloque os arquivos `.mdc`** na raiz do seu projeto ou em um diretório de configuração (ex: `.cursor-rules/`).

3. **Edite ou crie arquivos normalmente** no Cursor.

4. O Cursor aplicará automaticamente as regras definidas nos arquivos `.mdc` com base nos caminhos (`globs`) e linguagens.

## Personalização

Você pode alterar qualquer arquivo `.mdc` para:
- Atualizar caminhos (`globs`) se mudar a estrutura de pastas.
- Adicionar novas regras específicas à sua equipe ou cliente.
- Criar regras temporárias para migrações/refatorações.

## Boas Práticas no Uso

- Sempre mantenha os arquivos `.mdc` versionados no Git.
- Atualize as regras conforme o projeto evolui.
- Use essas convenções como fonte única da verdade no time.

## Referência

- Documentação do Cursor Project Rules: https://docs.cursor.sh/project-rules
- Formato dos arquivos `.mdc`: [Markdown + YAML Header](https://docs.cursor.sh/project-rules/creating-rules)

