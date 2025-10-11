# AWS Serverless Deployment Guide

This guide outlines how to deploy the IdeaBridge stack on AWS using fully serverless services—no VPC required.

## Architecture Overview

| Layer     | Service            | Notes |
|-----------|--------------------|-------|
| Frontend  | Amazon S3 + CloudFront | Host the built React app from an S3 bucket and serve it globally through CloudFront. |
| Backend API | AWS Lambda + Amazon API Gateway | Uses the Express app wrapped by `@vendia/serverless-express`. |
| Verification | Amazon SNS | Sends SMS verification codes (see `backend/.env.example`). |
| Data (prototype) | In-memory store | Current mock data is stateless. For persistence, replace the mock stores with DynamoDB tables or other managed databases. |

> **Limitation**: The current backend uses in-memory stores for ideas, apps, and users. This is fine for demos but data resets between Lambda invocations. Plan a follow-up migration to DynamoDB (see the "Next steps" section below).

## Backend Deployment (AWS Lambda + API Gateway)

1. **Install dependencies and build**
   ```bash
   cd backend
   npm install
   npm run build
   ```

2. **Package Lambda**
   - Copy the compiled output (`dist/`) and production dependencies into a staging directory:
     ```bash
     mkdir -p lambda-build
     cp -R dist lambda-build/
     npm prune --omit=dev
     cp -R node_modules package.json package-lock.json lambda-build/
     ```
   - Zip the folder:
     ```bash
     cd lambda-build
     zip -r ../idea-bridge-backend.zip .
     ```

3. **Create the Lambda function**
   - Runtime: **Node.js 20.x**
   - Handler: `dist/lambda.handler`
   - Memory: 512 MB is sufficient for the mock workload.
   - Environment variables: replicate those from `backend/.env` (SNS, JWT secret, session cookie name, etc.).
   - Timeout: 10 seconds.

4. **Expose via API Gateway**
   - Create an HTTP API (or REST API) and integrate it with your Lambda function (proxy integration).
   - Enable CORS for the S3/CloudFront domain of your frontend. Set `config.corsOrigin` (env var `CORS_ORIGIN`) to match the deployed frontend URL.
   - Deploy the API and note the invoke URL.

## Frontend Deployment (S3 + CloudFront)

1. Build the production assets:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. Upload `dist/` to an S3 bucket (make it private and front it with CloudFront, or configure static website hosting if you prefer):
   ```bash
   aws s3 sync dist/ s3://<your-frontend-bucket>/ --delete
   ```

3. Create a CloudFront distribution pointing to the bucket. Configure caching and error responses (e.g., redirect 404s to `/index.html` for SPA routing).

4. Update the environment variable `VITE_API_BASE_URL` (or the API base config) to the API Gateway URL so the SPA calls the Lambda endpoint.

## Verification (Amazon SNS)

- Follow the [AWS text messaging setup](https://docs.aws.amazon.com/sns/latest/dg/sns-getting-started.html) to request an origination number or Sender ID.
- Ensure the Lambda function has permission to call `sns:Publish` (attach an execution role with that permission).
- Configure the relevant environment variables (see `backend/.env.example`).

## Database Next Steps (DynamoDB)

The current codebase keeps data in memory under `backend/src/data/`. To make the backend truly persistent and serverless:

1. **Design tables** (e.g., `Users`, `Ideas`, `Apps`, `Sessions`, `VerificationRequests`). Use single-table design or multiple tables as needed.
2. **Replace the store modules** (`userStore.ts`, `ideaStore.ts`, etc.) with DynamoDB DAO modules using the AWS SDK v3 (`@aws-sdk/lib-dynamodb`).
3. **Leverage Lambda concurrency**: DynamoDB handles high concurrency; ensure idempotent writes to avoid conflicts.
4. **Provisioned vs. on-demand**: Start with on-demand capacity while usage is unknown.

## CI/CD Ideas

- **AWS SAM or CDK**: Define infrastructure and packaging via templates for repeatable deployments.
- **GitHub Actions / AWS CodeBuild**: Automate build, test, and deploy steps. Package the Lambda artifact and upload to S3, then update the Lambda function.
- **Infrastructure as Code** ensures you can recreate the entire stack (buckets, CloudFront, Lambda, API Gateway, SNS) from version-controlled definitions.

## Summary Checklist

- [ ] Build and zip the backend for Lambda using `dist/lambda.handler`.
- [ ] Deploy the Lambda function and configure API Gateway.
- [ ] Deploy the frontend build to S3 + CloudFront and update API URL.
- [ ] Configure SNS identities (Sender ID/origination number) and environment variables.
- [ ] Plan a data persistence migration (DynamoDB) if you move beyond prototypes.
