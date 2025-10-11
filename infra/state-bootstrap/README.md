# Terraform Remote State Bootstrap

This helper configuration provisions the infrastructure required for Terraform's
remote state when using the main deployment under `../terraform`.

## Resources created
- S3 bucket to store `terraform.tfstate` (versioned + SSE enforced)
- DynamoDB table used for state locking

## Usage
1. From this directory, initialize and apply the bootstrap stack (using the
   same AWS account/region as the main deployment):
   ```bash
   terraform init
   terraform apply
   ```
   Optionally override names:
   ```bash
   terraform apply \
     -var="project_name=idea-bridge" \
     -var="environment=prod" \
     -var="state_bucket_name=idea-bridge-prod-tf-state" \
     -var="lock_table_name=idea-bridge-prod-tf-locks"
   ```

2. Once the bucket/table exist, update the backend settings for the main
   Terraform project (`../terraform/backend.tf`) with the actual bucket and
   table names if they differ from the defaults.

3. Re-run `terraform init -reconfigure` in `../terraform` to migrate local
   state into the remote backend.

> ⚠️ After the bucket is in use by Terraform's backend, **do not** destroy it.
> The `prevent_destroy` lifecycle rule should be enabled manually or enforced
> via separate policy controls outside of this bootstrap module.
