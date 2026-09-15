## [2.0.2](https://github.com/WYRE-AI/node-datto-saas-protection/compare/v2.0.1...v2.0.2) (2026-08-25)


### Bug Fixes

* migrate to WYRE-AI org (npm scope, ghcr namespace, registry) ([#52](https://github.com/WYRE-AI/node-datto-saas-protection/issues/52)) ([4e631b1](https://github.com/WYRE-AI/node-datto-saas-protection/commit/4e631b13f33644bcb01c16a3d94f62e02c264c0c))

## [2.0.1](https://github.com/wyre-technology/node-datto-saas-protection/compare/v2.0.0...v2.0.1) (2026-06-22)


### Bug Fixes

* **tsconfig:** restore include/exclude globs ([#37](https://github.com/wyre-technology/node-datto-saas-protection/issues/37)) ([5fb956b](https://github.com/wyre-technology/node-datto-saas-protection/commit/5fb956b0e40b050245725d0c1240018336fd4925))

# [2.0.0](https://github.com/wyre-technology/node-datto-saas-protection/compare/v1.0.1...v2.0.0) (2026-05-15)


* fix!: use HTTP Basic auth + /v1/saas base for SaaS Protection API ([#2](https://github.com/wyre-technology/node-datto-saas-protection/issues/2)) ([c052563](https://github.com/wyre-technology/node-datto-saas-protection/commit/c0525637a19c13f9490bb6ad3465fbd3f97ebdd3))


### BREAKING CHANGES

* DattoSaasProtectionConfig.apiKey removed. Callers must
now pass both publicKey and secretKey.

Known follow-up: per-customer resource paths in src/resources/*.ts were
written against the same speculative spec and may need correction once
a live partner key is available for verification (CHANGELOG flags this).

## [1.0.1](https://github.com/wyre-technology/node-datto-saas-protection/compare/v1.0.0...v1.0.1) (2026-05-02)


### Bug Fixes

* switch base URL from dattobackup.com to datto.com ([9c8571b](https://github.com/wyre-technology/node-datto-saas-protection/commit/9c8571bd2eefdd6a9ef3ae5fef0f07c28cd04156)), closes [msp-claude-plugins#69](https://github.com/msp-claude-plugins/issues/69)

# 1.0.0 (2026-05-01)


### Features

* initial SDK scaffold for Datto SaaS Protection REST API ([dfaec84](https://github.com/wyre-technology/node-datto-saas-protection/commit/dfaec84e090840cc3e5f25645f1228aae3a5e9f5))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Release workflow no longer persists a write-scoped git credential across `npm ci`.** The release job declares `contents: write`, which overrides this repo's read-only default workflow permission, so `actions/checkout`'s default persisted credential was write-scoped and lived in `.git/config` through dependency install, build and test — readable by any compromised dependency lifecycle script. `persist-credentials: false` is semantic-release's own documented GitHub Actions recipe; it authenticates its pushes from `GITHUB_TOKEN` directly and never needed the persisted credential. (CWE-250)

### Changed (BREAKING)

- Auth scheme: `Authorization: Bearer <apiKey>` → `Authorization: Basic base64(publicKey:secretKey)`. The original scaffold used a Bearer token against `/api/v1/clients` — that's Datto BCDR/PSA's API surface. Datto SaaS Protection's REST API uses HTTP Basic auth with a public/secret key pair issued from the partner portal.
- Base URL: `https://api.{us,eu}.datto.com/api/v1` → `https://api.{us,eu}.datto.com/v1/saas`. The SaaS Protection REST API is rooted at `/v1/saas`; the old prefix returned `exception.notfoundhttpexception` 404s from Datto's Symfony edge.
- Config: `DattoSaasProtectionConfig.apiKey` removed. Callers must now pass both `publicKey` and `secretKey`.

### Known issues

- Resource paths (`/clients/{id}/domains`, `/clients/{id}/activity`, etc.) were written against the same speculative spec as the auth/base-URL bugs. Only `/v1/saas/domains` is confirmed against published docs. Per-customer paths may need further correction once we have a live partner key to test against.
