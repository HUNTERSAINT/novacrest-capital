---
name: Orval generated export collisions
description: Resolving duplicate names between generated Zod request schemas and generated schema type files.
---

When Orval emits the same request-body name from both `generated/api` and `generated/types`, a barrel that wildcard-exports both modules can fail TypeScript compilation. Keep the runtime Zod schema available by explicitly re-exporting that symbol from `generated/api` in the package barrel.

**Why:** The server imports request-body schemas from the package barrel to validate runtime requests, while Orval also generates a type file with the same operation-derived name.

**How to apply:** After changing the OpenAPI spec and running codegen, check `typecheck:libs` for duplicate-export errors. Add an explicit re-export for the schema that the server validates; do not hand-edit generated files.