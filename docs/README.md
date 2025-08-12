# Documentação da API Boilerplate

Este diretório contém arquivos de documentação e contexto utilizados para guiar o desenvolvimento da API Boilerplate.

Os arquivos aqui armazenados estão no formato `.mdc`, compatível com o Cursor, e não são aplicados automaticamente como regras, mas servem como **base de conhecimento** para consulta pelo agente de IA e para os desenvolvedores humanos.

## Estrutura dos Arquivos

- `architecture.mdc` – Visão geral da arquitetura do sistema
- `auth.mdc` – Estratégia de autenticação e controle de acesso
- `deployment.mdc` – Estratégias de deploy, configuração de ambientes e CI/CD
- `endpoints.mdc` – Padrões e exemplos de rotas REST
- `entities.mdc` – Estrutura das entidades do banco de dados
- `guardrails.mdc` – Regras de segurança, proteções contra operações destrutivas e configuração de CORS
- `adr/` – Contém os "Architecture Decision Records" (ADRs), que documentam decisões importantes de arquitetura.

## Uso recomendado

- Referência rápida para entender entidades, regras e contexto de negócio
- Suporte ao agente de IA do Cursor durante a geração ou modificação de código
- Base para onboarding de novos membros do time

Todos os arquivos seguem a estrutura com cabeçalho YAML exigida pelo Cursor para facilitar a indexação e leitura estruturada.