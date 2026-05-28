# documents

Documents for nbtca.

## How to use

### Install dependencies

1. Install Node.js 22.21.1
2. Install pnpm 9.0.0

   ```bash
   npm install -g pnpm
   ```

3. Install dependencies

   ```bash
   pnpm install --frozen-lockfile
   ```

### Start development server

```bash
pnpm docs:dev
```

### Build for production

```bash
pnpm docs:build
```

### Lint code

```bash
pnpm lint
```

### Verify before pushing

Run the same checks as CI locally:

```bash
pnpm install --frozen-lockfile
pnpm test -- --run
pnpm run ci:lint
pnpm docs:build
```
