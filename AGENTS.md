<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Guest checkout, order tracking and slip attach go through SECURITY DEFINER RPCs (place_order, track_orders, attach_slip); orders/order_items have no anon table access. Why: customers have no accounts, prices/stock must be validated server-side.
- Stock is deducted only by the confirm_order RPC (staff-only, idempotent via stock_deducted). Why: single source of truth for inventory sync.
