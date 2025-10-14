# IdeaBridge AWS Infrastructure Design

_Last updated: 2025-10-15_

## 1. Overview
IdeaBridge deploys as a fully managed serverless stack on AWS. The design emphasises low operational overhead, global availability, and pay-per-use economics.

```
Clients ─> CloudFront ─> (S3 static assets, API Gateway) ─> Lambda ─> DynamoDB & SNS
                                 │
                                 └─> CodePipeline/CodeBuild for CI/CD
```

Refer to `aws-architecture.drawio` for a visual diagram rendered with AWS 2025 icons.

## 2. Environments
| Environment | Purpose | Notes |
| --- | --- | --- |
| `dev` | Shared development sandbox | Uses lower-cost defaults, optional SMS disabled. |
| `staging` | Pre-production validation | Mirrors production config but throttled throughput. |
| `prod` | Customer-facing | Backed by custom domain, WAF (roadmap), full observability. |

Terraform workspaces or separate state files manage isolation. Remote state lives in S3 (`state-bootstrap` module).

## 3. Core Services
### 3.1 Amazon CloudFront
- Distributes frontend SPA globally.
- Behaviours:
  - Default: `GET/HEAD` to S3 origin, HTTP->HTTPS redirect.
  - `/api/*`: forwards to API Gateway without caching, using managed cache/origin request policies.
- Default TLS certificate; custom domain + ACM is a backlog item.

### 3.2 Amazon S3
- Stores built frontend assets (`frontend/dist`).
- Versioning enabled to support rollbacks.
- Public access blocked; CloudFront origin access identity grants read access.

### 3.3 Amazon API Gateway (HTTP API)
- Routes `/api/*` requests to Lambda via proxy integration.
- Request/response compression enabled.
- Stage variables control environment-specific settings (e.g., log level).

### 3.4 AWS Lambda
- Runs the Express API using `@vendia/serverless-express`.
- Deployed as a zip artifact containing `dist/` and production `node_modules`.
- Environment variables configured via Terraform:
  - `NODE_ENV`, `JWT_SECRET`, `SESSION_COOKIE_NAME`, `PHONE_VERIFICATION_ENABLED`, SNS credentials.
- Memory: 512 MB (tunable). Timeout: 15 seconds.

### 3.5 Amazon DynamoDB
- Single table design (`<project>-<env>-data`).
- Primary key: `PK`/`SK`.
- Stores verification workflow today; future migration for ideas, submissions, sessions.
- TTL enabled for ephemeral items (e.g., verification requests).

### 3.6 Amazon SNS
- Sends SMS verification codes.
- Sandbox-friendly spend limit (`aws_sns_monthly_spend_limit`). Raise limit post go-live.

### 3.7 CI/CD (CodePipeline + CodeBuild)
- Pipeline stages:
  1. Source (GitHub OIDC integration).
  2. Build (CodeBuild) – installs dependencies, runs tests, packages frontend + backend.
  3. Deploy – uploads frontend to S3, updates Lambda via Terraform or direct API.
- IAM role exported as `github_actions_role_arn` for GitHub Actions to trigger deployments.

## 4. Security
- IAM least privilege via Terraform-managed policies.
- Lambda environment secrets provided at deploy time; plan to migrate to AWS Secrets Manager.
- CloudFront -> API Gateway connection uses HTTPS only.
- CORS configurable via Terraform variables (defaults to `https://app.example.com`).
- Session cookie marked HttpOnly & Secure; ensure CloudFront behaviour preserves headers.
- Add AWS WAF in front of CloudFront (backlog) for rate limiting / IP allowlists.

## 5. Observability
- Lambda logs stored in CloudWatch Log Groups with 14-day retention (configurable).
- X-Ray tracing optional; enable via Lambda configuration once required.
- API Gateway access logs disabled by default to control cost; enable per stage when debugging.
- Future: integrate CloudWatch dashboards + alarms for error rate, latency, DynamoDB throttling.

## 6. Networking
- Fully serverless; no VPC required.
- If future requirements include VPC resources (RDS, ElastiCache), create additional subnets and security groups, then attach Lambda to the VPC with appropriate NAT/Gateway configuration.

## 7. Deployment Workflow
1. Developer runs `npm run build` (frontend) + `npm run build` (backend) locally for validation.
2. Commit & push to `develop` -> GitHub Actions CI (lint/test).
3. Merge into `main` (or tag release) -> triggers CodePipeline build.
4. CodePipeline package step creates `idea-bridge-backend.zip` and uploads frontend assets to an artifacts bucket.
5. Terraform (either manually or via pipeline) applies infrastructure changes.
6. S3 invalidation triggered post deploy to ensure CloudFront cache refresh.

## 8. Configuration Matrix
| Variable | Location | Description |
| --- | --- | --- |
| `project_name` | Terraform var | e.g., `idea-bridge` |
| `environment` | Terraform var | `dev`, `staging`, `prod` |
| `cors_allowed_origin` | Terraform var | Origin allowed for API Gateway responses |
| `jwt_secret` | Terraform var / SSM | Signing key for sessions |
| `aws_sns_sender_id` | Terraform var | Label for outbound SMS |
| `aws_sns_origination_number` | Terraform var | Verified phone number |
| `phone_verification_enabled` | Lambda env | Toggle SMS requirement |

## 9. Cost Snapshot (monthly, est. dev region)
| Service | Cost (USD) |
| --- | --- |
| CloudFront | $1.00 (low traffic) |
| S3 storage + requests | $0.50 |
| Lambda invocations | $1.50 |
| API Gateway | $2.00 |
| DynamoDB (on-demand) | $1.00 |
| SNS (sandbox SMS) | $0.10 |
| **Total** | **~$6.10** |

## 10. Roadmap
- Custom domain + ACM certificate with automatic renewals.
- AWS WAF rules for bot protection & rate limiting.
- Step Functions for complex workflows (e.g., submission moderation).
- Event-driven analytics pipeline using Kinesis Firehose or EventBridge -> Redshift.
