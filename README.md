# SerranoFC Dashboard

Dashboard de gestão de jogadores e transferências para o SerranoFC. Sistema completo com autenticação, controle de acesso por role e gerenciamento de dados de jogadores.

## Tecnologias

- **Framework**: Next.js 16.0.1 (App Router com Turbopack)
- **Banco de dados**: PostgreSQL + Prisma 7.1.0
- **Autenticação**: JWT (jsonwebtoken) + bcryptjs
- **Frontend**: React 19.2.0 + Tailwind CSS 4.1.17
- **Linguagem**: TypeScript 5
- **Validação**: Zod

## Instalação

### 1. Clonar repositório e instalar dependências

```bash
cd serranofc-dashboard
npm install
```

### 2. Configurar variáveis de ambiente

Criar arquivo `.env.local` na raiz do projeto:

```env
# Banco de dados PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/serranofc"

# JWT
JWT_SECRET="dev_secret_change_in_prod"
JWT_EXPIRES_IN="7d"

# Node environment
NODE_ENV="development"
```

### 3. Configurar banco de dados

```bash
# Executar migrations do Prisma
npx prisma migrate deploy

# Fazer seed com usuários iniciais
npx prisma db seed
```

Isso criará dois usuários padrão:
- **Admin**: `admin@serrano.com` / `admin@2025`
- **Client**: `cliente@serrano.com` / `cliente@2025`

### 4. Iniciar servidor de desenvolvimento

```bash
npm run dev
```

Servidor estará disponível em `http://localhost:3000`

## Estrutura de Pastas

```
serranofc-dashboard/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Autenticação
│   │   │   ├── login/route.ts    # POST - Login
│   │   │   ├── me/route.ts       # GET - Validar sessão
│   │   │   └── sync-token/route.ts # POST - Sincronizar token
│   │   ├── jogadores/            # Jogadores CRUD
│   │   ├── clubs/                # Clubes CRUD
│   │   ├── transferencias/       # Transferências CRUD
│   │   └── usuarios/             # Usuários CRUD
│   ├── login/                    # Página de login
│   ├── jogadores/                # Listagem de jogadores
│   ├── dashboard/                # Dashboard principal
│   ├── perfil/                   # Perfil do usuário
│   ├── admin/                    # Painel administrativo
│   │   ├── usuarios/             # Gestão de usuários
│   │   ├── clubes/               # Gestão de clubes
│   │   ├── jogadores/            # Gestão de jogadores
│   │   └── transferencias/       # Gestão de transferências
│   ├── layout.tsx                # Layout principal
│   ├── page.tsx                  # Home page
│   └── globals.css               # Estilos globais
├── auth/
│   └── AuthContext.tsx           # Context de autenticação
├── components/                   # Componentes React reutilizáveis
│   ├── AppShell.tsx              # Shell da aplicação
│   ├── Card.tsx                  # Card de jogador
│   ├── DashboardClient.tsx       # Dashboard interativo
│   ├── JogadoresFilter.tsx       # Filtros de jogadores
│   ├── Atoms/                    # Componentes pequenos/básicos
│   └── ...
├── config/
│   └── nav.ts                    # Configuração de navegação
├── hooks/
│   └── useTokenSync.ts           # Hook para sincronizar token
├── lib/
│   ├── api.ts                    # Cliente API
│   ├── prisma.ts                 # Instância Prisma
│   └── dashboard/                # Utilitários dashboard
├── middleware.ts                 # Middleware de proteção de rotas
├── prisma/
│   ├── schema.prisma             # Schema do banco de dados
│   ├── seed.ts                   # Script de seed
│   └── migrations/               # Histórico de migrations
├── type/
│   ├── jogador.tsx               # Interface Player
│   └── ...
└── package.json

```

## Fluxo de Autenticação

### Login

1. Usuário entra email e senha na página `/login`
2. Frontend faz POST para `/api/auth/login` com credenciais
3. Backend valida email no banco de dados
4. Backend compara senha com bcryptjs contra `passwordHash`
5. Se válido, gera JWT token com 7 dias de validade
6. Token armazenado em `localStorage` no frontend
7. Token também sincronizado para httpOnly cookie via `/api/auth/sync-token`

### Validação de Sessão

1. Na inicialização, AuthContext chama `/api/auth/me` com token do localStorage
2. Backend valida assinatura JWT
3. Se válido, retorna usuário atualizado + token refrescado
4. Middleware protege todas as rotas exceto `/login` e `/`

### Controle de Acesso por Role

```typescript
enum Role {
  ADMIN = "ADMIN",    // Acesso total, pode gerenciar usuários
  CLIENT = "CLIENT"   // Acesso restrito, pode ler dados
}
```

**Rotas Protegidas por Role:**
- `/admin/*` → Requer `ADMIN`
- `/perfil` → Requer autenticado (qualquer role)
- `/jogadores` → Requer autenticado (qualquer role)

## Features Implementadas

### ✅ P0 - Autenticação Completa

- [x] Login funcional com hash de senha (bcryptjs)
- [x] Geração de JWT tokens (7 dias)
- [x] Validação de sessão
- [x] Sincronização de token localStorage → httpOnly cookie
- [x] Seed automático de usuários (admin + client)

**Credenciais padrão:**
- Admin: `admin@serrano.com` / `admin@2025`
- Client: `cliente@serrano.com` / `cliente@2025`

### ✅ P1 - Gestão de Usuários

- [x] Página de perfil (`/perfil`)
  - Visualizar dados do usuário
  - Editar nome
  - Visualizar role (Admin/Client)
  - Botão de logout
  
- [x] Painel administrativo (`/admin/usuarios`)
  - Listar todos os usuários (admin-only)
  - Criar novo usuário com email, nome, senha e role
  - Editar nome do usuário
  - Deletar usuário
  - Validação de email único

### ✅ P2 - Jogadores e Filtros

- [x] Remoção completa do conceito "variação"
  - Removido campo `variacaoPct` do schema Prisma
  - Removido de todas as interfaces TypeScript
  - Removido de componentes UI
  - Removido de API endpoints

- [x] Barra de "Posse do Serrano" (verde)
  - Mostra percentual de posse do Serrano
  - Apenas visível se `valorMercado > 0`
  - Verde para indicar posse
  
- [x] Filtros funcionais em `/jogadores`
  - **Clube**: Filtra por `clubeNome`
  - **Representação**: Filtra por `representacao`
  - **Posição**: Filtra por `posicao`
  - **Pé dominante**: Filtra por `peDominante`
  - **Idade**: Range slider (min/max)
  - **Valor de mercado**: Range slider (min/max)

### 📝 P3 - Documentação (Este README)

## Modelos de Dados

### User

```typescript
{
  id: string
  name: string
  email: string (único)
  passwordHash: string (bcryptjs)
  role: Role (ADMIN | CLIENT)
  createdAt: Date
  updatedAt: Date
}
```

### Player

```typescript
{
  id: string
  nome: string
  posicao: string
  clube: string
  clubeNome: string
  peDominante: string
  idade: number
  valorMercado: number
  possePct: number (percentual de posse)
  representacao: string (agência/representante)
  // ... 38 campos no total
}
```

### Club

```typescript
{
  id: string
  nome: string
  nomePaisagemPequena: string
  nomePaisagemMedia: string
  imagemUrl: string
  createdAt: Date
  updatedAt: Date
}
```

### Transfer

```typescript
{
  id: string
  jogadorId: string
  clubeOrigem: string
  clubeDestino: string
  dataTransferencia: Date
  dataAnuncio: Date
  valor: number
  createdAt: Date
  updatedAt: Date
}
```

## API Endpoints

### Autenticação

```
POST /api/auth/login
Body: { email: string, password: string }
Response: { token: string, user: User }

GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { user: User, token: string (novo) }

POST /api/auth/sync-token
Body: { token: string }
Response: { success: boolean }
```

### Jogadores

```
GET /api/jogadores
Response: { data: Player[] }

POST /api/jogadores
Body: Player data
Response: { id: string, ... }

PUT /api/jogadores/[id]
Body: Player data
Response: Player

DELETE /api/jogadores/[id]
Response: { success: boolean }
```

### Usuários (admin-only)

```
GET /api/usuarios
Response: { users: User[] }

POST /api/usuarios
Body: { name, email, password, role }
Response: User

PUT /api/usuarios/[id]
Body: { name, ... }
Response: User

DELETE /api/usuarios/[id]
Response: { success: boolean }
```

### Clubes

```
GET /api/clubs
Response: { data: Club[] }

POST /api/clubs
Body: Club data
Response: Club

PUT /api/clubs/[id]
Body: Club data
Response: Club

DELETE /api/clubs/[id]
Response: { success: boolean }
```

## Como Testar as Features

### 1. Testar Login

```bash
# Abrir navegador em http://localhost:3000/login
# Usar credenciais:
Email: admin@serrano.com
Password: admin@2025
```

### 2. Testar Página de Perfil

```bash
# Após fazer login como admin
# Clicar em "Perfil" no menu
# Editar nome e verificar sucesso
# Clicar em "Logout"
```

### 3. Testar Admin - Gestão de Usuários

```bash
# Login como admin
# Navegar para Admin → Usuários
# Criar novo usuário com email único
# Editar nome de usuário
# Deletar usuário (com confirmação)
```

### 4. Testar Filtros de Jogadores

```bash
# Login como qualquer usuário
# Navegar para Jogadores
# Testar cada filtro:
#   - Clube: selecionar clube
#   - Representação: selecionar agência
#   - Posição: selecionar posição
#   - Pé dominante: selecionar pé
#   - Idade: mover sliders
#   - Valor: mover sliders
# Verificar que os resultados filtram corretamente
```

### 5. Testar Barra de Posse

```bash
# Na página de Jogadores
# Cada card de jogador deve mostrar:
#   - Barra verde com percentual (se valorMercado > 0)
#   - Nenhuma barra (se valorMercado = 0)
```

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DATABASE_URL` | — | URL de conexão PostgreSQL |
| `JWT_SECRET` | `dev_secret_change_in_prod` | Chave para assinar JWT |
| `JWT_EXPIRES_IN` | `7d` | Tempo de expiração do token |
| `NODE_ENV` | `development` | Ambiente de execução |

## Commands

```bash
# Iniciar dev server
npm run dev

# Build para produção
npm run build

# Iniciar server de produção
npm start

# Criar migration Prisma
npx prisma migrate dev --name <description>

# Seed do banco
npx prisma db seed

# Resetar banco (⚠️ delete all data)
npx prisma migrate reset

# Abrir Prisma Studio (GUI)
npx prisma studio
```

## Troubleshooting

### Erro: "Could not connect to PostgreSQL"

```bash
# Verificar se PostgreSQL está rodando
# Verificar DATABASE_URL no .env.local
# Exemplo válido:
# postgresql://postgres:password@localhost:5432/serranofc
```

### Erro: "Unauthorized" em APIs

```bash
# Verificar se token foi incluído no header
# Authorization: Bearer <token>
# Token deve estar em localStorage após login
```

### Erro: "Middleware deprecated"

```bash
# Warning não-crítico, próximas versões migrar para "proxy"
# Não afeta funcionamento atual
```

### Filtros não funcionando

```bash
# Verificar que os dados foram seedados
# npx prisma db seed

# Verificar valores em Prisma Studio
# npx prisma studio

# Recompilar com npm run dev
```

## Segurança

- ✅ Senhas hash com bcryptjs (10 salt rounds)
- ✅ JWT tokens com assinatura criptográfica
- ✅ Proteção de rotas por middleware
- ✅ httpOnly cookies para melhor segurança de token
- ⚠️ **TODO**: Usar `JWT_SECRET` robusto em produção
- ⚠️ **TODO**: Implementar CORS restritivo
- ⚠️ **TODO**: Rate limiting em endpoints de auth

## Próximas Features

- [ ] Refresh tokens com rotation
- [ ] Two-factor authentication (2FA)
- [ ] Email verification no signup
- [ ] Reset password flow
- [ ] Auditoria de ações de admin
- [ ] Export dados para CSV/Excel
- [ ] Gráficos e dashboards avançados
- [ ] API documentation (Swagger/OpenAPI)

## Contribuindo

1. Criar branch para feature: `git checkout -b feature/minha-feature`
2. Commit as mudanças: `git commit -am 'Adiciona minha feature'`
3. Push para branch: `git push origin feature/minha-feature`
4. Abrir Pull Request

## Licença

MIT

## Contato

Desenvolvido para SerranoFC
