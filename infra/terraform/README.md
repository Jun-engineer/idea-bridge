# Terraform Deployment (AWS Serverless)

This configuration provisions the core AWS resources for the IdeaBridge serverless architecture in the **ap-northeast-1 (Tokyo)** region and assumes AWS account **085141726968**. Refer to `docs/aws-infrastructure.md` for the high-level blueprint. The module creates:

- An S3 bucket + CloudFront distribution for the React SPA
- A Lambda function (Express API via `@vendia/serverless-express`)
- An HTTP API Gateway integrating with the Lambda function
- A DynamoDB table placeholder for future persistence work
- SMS preferences for Amazon SNS

## Prerequisites
1. Terraform ≥ 1.5
2. AWS CLI credentials configured for account `085141726968` with privileges to create the listed resources
3. A packaged backend zip file containing the compiled Lambda (`dist/`) and production `node_modules`
   ```bash
   cd backend
   npm install
   npm run build
   npm prune --omit=dev
   zip -r idea-bridge-backend.zip dist node_modules package.json package-lock.json
   ```
   The archive is gitignored; generate it on demand before each deployment.

## Usage
1. **Bootstrap remote state (one-time)**
   ```bash
   cd infra/state-bootstrap
   terraform init
   terraform apply -auto-approve
   ```
   Capture the `state_bucket_name` and `lock_table_name` outputs if you plan to
   customise the backend configuration.

2. **Switch to the main deployment**
   ```bash
   cd ../terraform
   cp terraform.tfvars.example terraform.tfvars    # fill in secrets
   terraform init -reconfigure
   terraform plan
   terraform apply
   ```

### One-command helper

For faster local iteration, use the helper script which packages the backend
Lambda and runs Terraform:

```bash
cd infra/terraform
./apply-local.sh
```

The script will prompt for `JWT_SECRET` if the environment variable is unset.
Supply `--plan-only` to skip the final apply, `--skip-build` if you already have
an up-to-date `backend/idea-bridge-backend.zip`, and `--reconfigure` to pass
`-reconfigure` to `terraform init`.

### `terraform.tfvars` Example
Create `terraform.tfvars` (not committed) with the sensitive values:
```hcl
jwt_secret                  = "super-secret-change-me"
session_cookie_name         = "idea_bridge_session"
cors_allowed_origin         = "https://app.example.com"
lambda_package_path         = "../../backend/idea-bridge-backend.zip"
aws_sns_sender_id           = "IdeaBridge"
aws_sns_origination_number  = "+81XXXXXXXXXX"
aws_sns_monthly_spend_limit = "1"
```

## Notes
- The configuration enforces an account precondition; running against another account will fail.
- CloudFront uses the default certificate and domain. Add ACM/Route53 resources if you want a custom domain.
- DynamoDB is provisioned but the current backend still uses in-memory stores. Update the repository’s data access layer before relying on DynamoDB in production.
- Secrets are passed directly through environment variables for brevity. Consider migrating them to AWS Secrets Manager or SSM Parameter Store and referencing them via Lambda environment variables or extensions.
- Monthly SNS spend limit defaults to "1" (sandbox friendly). Increase only after
   AWS approves a higher limit.
- The Terraform backend is configured to use an S3 bucket (`idea-bridge-prod-tf-state`)
   and DynamoDB lock table (`idea-bridge-prod-tf-locks`). If you override the
   bootstrap names, update `backend.tf` accordingly before re-running
   `terraform init -reconfigure`. Terraform ≥1.13 emits a deprecation warning for
   `dynamodb_table`; upgrade the pipeline to use a newer init lockfile once
   available.
- `phone_verification_enabled` defaults to `true`, so ensure SNS credentials and
   origination numbers are configured; set it to `false` only when developing
   without SMS delivery.
- Terraform now provisions an IAM role (`github_actions_role_arn` output) that
   GitHub Actions can assume via OIDC for CI/CD deployments.
- The AWS architecture diagram (`../../docs/aws-architecture.drawio`) visualises
   the resources deployed by this stack using the AWS 2025 icon set.
