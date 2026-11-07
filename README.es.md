# secure-ci-starter

**Un baseline de seguridad para tu CI/CD en una tarde.**

API mínima en Node.js 20+ / TypeScript / Express conectada a un pipeline de
seguridad completo en GitHub Actions. Es la demo funcional del servicio
**"Agrega escaneo de seguridad a tu CI/CD"** que ofrezco a startups.
La documentación completa está en inglés: [README.md](README.md).

## Qué detecta

| Job                   | Herramienta                                      | Pregunta que responde                                              |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| `dependency-audit`    | `npm audit --audit-level=high` + `npm outdated`  | ¿Mis dependencias tienen CVEs conocidos?                           |
| `secret-scan`         | gitleaks (historial completo de git)             | ¿Alguien subió una API key, token o contraseña, alguna vez?        |
| `sast`                | Semgrep (`p/ci`, `p/nodejs`, `p/owasp-top-ten`)  | ¿El código tiene patrones inseguros (eval, inyección, sin rate limit)? |
| `dependency-review`   | `actions/dependency-review-action`               | ¿**Este PR** agrega un paquete vulnerable o con licencia prohibida? |
| `codeql` (opcional)   | CodeQL `javascript-typescript`                   | ¿Un análisis de flujo de datos encuentra algo que los patrones no? |

Corre en cada push y pull request a `main`, y además **todos los lunes**
(los CVEs nuevos salen contra código viejo todos los días).

Incluye además: Dependabot semanal (npm y Actions), plantilla de PR con
checklist de seguridad, `SECURITY.md` (política de divulgación responsable),
`.gitleaks.toml`, `.semgrepignore`, y `scripts/local-scan.sh` para correr lo
mismo en tu máquina con `npm run scan`.

## La API de ejemplo

`GET /health`, `GET /users` (paginación acotada, nunca expone hashes) y
`POST /login` (validación estricta con zod, scrypt con comparación en tiempo
constante, mismo error para email desconocido y contraseña incorrecta, límite
de 5 intentos cada 15 minutos por IP). Headers de `helmet`, límite de body de
10 KB, errores sin stack trace. 14 tests con Vitest + supertest.

## Prueba rápida (60 segundos)

1. Haz **fork** del repo.
2. En la pestaña **Actions**, pulsa **Enable workflows**.
3. Abre un pull request con cualquier cambio y mira los checks `CI` y
   `Security` aparecer.

Localmente:

```bash
npm ci
npm test && npm run lint && npm run typecheck && npm run build
npm run scan
```

## Lo que entrego a clientes

Paquetes de precio fijo (USD):

| Paquete | Precio | Incluye |
| ------- | ------ | ------- |
| **A — Baseline** | **$200** (2 días) | Este pipeline adaptado a un repo, hallazgos de la primera corrida explicados. |
| **B — Baseline + correcciones** | **$350** (3–4 días) | Todo lo de A, más corrijo los hallazgos (rotar secretos, actualizar paquetes, validación y rate limiting faltantes) con tests y reporte escrito como [`docs/findings-example.md`](docs/findings-example.md). |
| **C — Multi-repo / monorepo** | **$500** (5 días) | A o B en hasta tres servicios, workflow reutilizable, reglas de branch protection, CodeQL, llamada de 30 min con tu equipo. |

Sin lock-in: toda la configuración queda en tu repo, comentada.

## Límites

SAST no es un pentest: encuentra patrones, no fallas de lógica de negocio ni
de autorización. Los escáneres solo conocen vulnerabilidades públicas. Habrá
falsos positivos que ajustar la primera semana. CodeQL en repos privados
requiere GitHub Advanced Security. Infraestructura y protección en runtime
quedan fuera del alcance.

## Contacto

**Sergio Ortiz** — desarrollador full-stack (TypeScript/Node, React,
OpenShift) en Ciudad de Guatemala, estudiante de maestría en seguridad
informática. Trabajo con startups en horarios de EE. UU. y Europa.

- Email: `sergio@example.com` <!-- reemplazar -->
- LinkedIn: `https://linkedin.com/in/REPLACE-ME`

Licencia [MIT](LICENSE) © 2026 Sergio Ortiz.
