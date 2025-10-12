# Terraform Remote State Bootstrap

This helper configuration provisions the infrastructure required for Terraform's
remote state when using the main deployment under `../terraform`.

## Resources created
- S3 bucket to store `terraform.tfstate` (versioned + SSE enforced)
- (Optional) DynamoDB table for legacy state locking workflows

## Usage
1. From this directory, initialize and apply the bootstrap stack (using the
   same AWS account/region as the main deployment):
   ```bash
   terraform init
   terraform apply
   ```
   Optionally override names (you can skip the lock table variables if relying
   on the new S3 lockfile behaviour in Terraform ≥ 1.13):
   ```bash
   terraform apply \
     -var="project_name=idea-bridge" \
     -var="environment=prod" \
     -var="state_bucket_name=idea-bridge-prod-tf-state" \
     -var="lock_table_name=idea-bridge-prod-tf-locks"
   ```

2. Once the bucket exists, update the backend settings for the main Terraform
   project (`../terraform/backend.tf`) with the actual bucket name if it differs
   from the defaults. If you still rely on a DynamoDB lock table (pre-Terraform
   1.13), update that here as well.

3. Re-run `terraform init -reconfigure` in `../terraform` to migrate local
   state into the remote backend.

> ⚠️ After the bucket is in use by Terraform's backend, **do not** destroy it.
> The `prevent_destroy` lifecycle rule should be enabled manually or enforced
> via separate policy controls outside of this bootstrap module.
