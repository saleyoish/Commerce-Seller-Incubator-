<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Live Commerce platform. Client-side tracking is initialized via `instrumentation-client.ts` (the correct pattern for Next.js 15.3+), with a reverse proxy configured in `next.config.ts` for reliable ingestion. Server-side tracking uses a shared `posthog-node` singleton in `lib/posthog-server.ts`. Ten events are tracked across the full seller lifecycle — from waitlist through purchase — on both client and server. User identity is established at login and signup with `posthog.identify()`, and error boundaries use `posthog.captureException()`.

| Event | Description | File |
|---|---|---|
| `waitlist_submitted` | Fired when a user submits the waitlist form on the home page. Top of the seller acquisition funnel. | `app/actions.ts` |
| `seller_signed_up` | Fired when a new seller account is successfully created. Includes `posthog.identify()`. | `app/signup/page.tsx` |
| `seller_logged_in` | Fired when a seller or admin successfully logs in. Includes `posthog.identify()`. | `app/login/page.tsx` |
| `application_step_advanced` | Fired each time the seller advances to the next step in the multi-step application form. Tracks funnel drop-off per step. | `app/apply/application-form.tsx` |
| `application_submitted` | Fired when the full seller application form is submitted successfully. | `app/apply/application-form.tsx` |
| `checkout_initiated` | Fired when a buyer clicks Proceed to Checkout on a product from a live seller page. | `app/live/[sellerId]/page.tsx` |
| `purchase_completed` | Fired server-side when a Stripe `checkout.session.completed` webhook is received and a sale is recorded. | `app/api/checkout/webhook/route.ts` |
| `training_module_completed` | Fired server-side when a seller completes a training module. | `app/api/training/complete-module/route.ts` |
| `stripe_connect_started` | Fired server-side when a seller initiates Stripe Connect onboarding to enable payouts. | `app/api/stripe/connect-onboarding/route.ts` |
| `tiktok_connect_initiated` | Fired server-side when a seller initiates TikTok account connection. | `app/api/tiktok/connect/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/404724/dashboard/1531987
- **Seller Acquisition Funnel** (waitlist → signup → application): https://us.posthog.com/project/404724/insights/xjDwfuzi
- **Purchase Revenue (Last 30 Days)**: https://us.posthog.com/project/404724/insights/8MZsl6QQ
- **Checkout Funnel (Initiated → Completed)**: https://us.posthog.com/project/404724/insights/K2V8SHew
- **Seller Onboarding Progress** (Stripe, TikTok, Training): https://us.posthog.com/project/404724/insights/t8yT0Uaa
- **New Sellers & Logins (Last 30 Days)**: https://us.posthog.com/project/404724/insights/v613AHbx

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
