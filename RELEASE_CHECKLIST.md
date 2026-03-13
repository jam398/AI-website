# Release Checklist

Use this checklist before treating a deploy as production-ready.

## Security

- `WORKER_SHARED_SECRET` is set on the deployed Cloudflare Worker.
- The admin panel and Android app are configured with the matching worker auth secret.
- GitHub PAT has `Contents: Read and write`.
- GitHub PAT also has `Actions: Read` if Deploy Status is expected to work.
- OpenAI API key is valid for GPT and Whisper-backed tools.

## Content

- `content/site.json` passes `npm run lint:content`.
- Contact email is intentional and consistent across visible email and CTA links.
- No placeholder contact data such as `example@...` remains.
- Home, Services, and Contact CTAs open the intended email client flow.

## Verification

- `npm run verify` passes locally.
- GitHub Actions `CI` workflow is green.
- GitHub Actions deploy workflow is green.
- The live URL shape is correct for the repo type:
  - `owner/repo` -> `https://owner.github.io/repo/`
  - `owner/owner.github.io` -> `https://owner.github.io/`
- The live site opens and key navigation paths work.

## Recovery

- A fresh `backup_site` backup exists before major content changes.
- The rollback path is documented in `MANUAL.md`.
