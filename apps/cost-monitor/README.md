# Cloudflare cost monitor

An independent scheduled Worker polls closed five-minute analytics windows with
10 minutes of ingestion allowance. D1 database and normalized SQL efficiency,
Workers CPU, R2 operations/storage, KV operations, DO SQL rows and Queue operations
are collected account-wide. R2/KV/DO/Queue operations are also normalized by
Worker invocation volume to distinguish normal traffic growth from amplification. Every six hours, reported daily billable usage is
reconciled across all products, including products without fast adapters.

Cost velocity extrapolates the latest five-minute window to one hour, including
R2 storage. It uses published overage rates **before included allowance**, rather
than an invoice prediction. R2 storage uses the peak of the last hour and a
30-day conversion. DO compute, KV/D1 storage and Containers are currently covered
by delayed billing reconciliation, not the fast burn-rate total. Billing data and
analytics can arrive late; a closed window is not a guarantee of final completeness.

Warnings require two consecutive windows. Critical absolute efficiency or spend
breaches alert immediately on the next available window. Relative thresholds use
a healthy EWMA baseline after 12 observations, with a minimum sample/volume gate;
suspicious data cannot train the baseline. Default spend thresholds are $0.50/hour
warning, $2/hour critical and $10/reported day warning. All thresholds live in the
Worker configuration/policy and should be reviewed against normal workloads.

Notifications are batched per recipient. Fast telemetry incidents repeat every
30 minutes while abnormal; reported daily billing is rechecked/reminded every
six hours. Recovery requires two valid normal observations. Failed recipients remain queued;
successful recipients are not resent on ordinary retries. Sending is limited to
8 attempts/hour and 120/day; pending messages remain queued on exhaustion. Native
email acceptance is not proof of delivery. Check Email Service delivery logs;
a crash between provider acceptance and persisting its receipt can cause a duplicate.

## Storage bounds

One SQLite Durable Object coordinates this account's low-frequency monitor only;
no business/user request passes through it. A persisted lease prevents concurrent
polls. Each time window is one aggregated JSON row. Raw SQL, parameters, user IDs,
request bodies and raw billing line items are not retained.

- Windows: 24-hour logical TTL, at most 288 rows, at most 48 KiB per row.
- State/baselines: 7-day TTL, at most 256 metrics and 192 KiB total; inactive baselines can be evicted earlier.
- Outbox: at most 64 aggregate notices, 7-day TTL; delivery receipts: last 12,
  at most 24 hours. Recipient addresses are private configuration.
- Cleanup uses indexed expiry and the window primary key at every collection;
  an alarm also reclaims expired rows when the cron stops (daily cleanup cadence).
- Collection has a fixed eight bounded GraphQL calls per run, plus one billing
  call per six hours. Responses are capped at 2 MiB. Truncation, unknown billing
  operation types and unavailable sources are explicit failures, never zero usage.

## Private configuration

Use `wrangler secret bulk` with `CF_MONITOR_API_TOKEN`, `MONITOR_ADMIN_TOKEN` and
`ALERT_RECIPIENTS`. The latter is a JSON list: `["owner@example.org", ""]`;
empty placeholders are ignored and additional recipients can be appended (max 20).
Never commit live addresses, credentials or incident evidence.

The dedicated API token is restricted to the account: Account Analytics Read,
Billing Read, and Email Sending Edit for the external watchdog's send API. Native
Worker sends use the EMAIL binding and an already-onboarded sender domain.

GitHub private configuration mirrors these as `CF_MONITOR_API_TOKEN`,
`COST_MONITOR_ADMIN_TOKEN`, `COST_MONITOR_RECIPIENTS` secrets, and `COST_MONITOR_URL`
variable. Production deploys only after successful main CI with exact-SHA checks.
A GitHub scheduled watchdog checks every 30 minutes independently of the Worker;
GitHub scheduling can be delayed, and its native-email path still depends on
Cloudflare Email Service. A platform-wide outage needs an additional external
mail provider to guarantee email delivery.

`/health` (GET) and `/run` (POST) require the admin bearer secret. The production
configuration has no test routes. A separate e2e environment enables fixed
synthetic scenarios; no arbitrary SQL or real resource writes are injected.

## Validation

`pnpm --filter @ghfind/cost-monitor typecheck`, `pnpm test`, and
`node --test scripts/cost-monitor-watchdog.test.mjs` verify policy and collectors.
`node scripts/cost-monitor-e2e.mjs` starts isolated real workerd/SQLite and verifies
first alert, partial-recipient retry, duplicate suppression, reminders, recovery,
storage limits, TTL purge and the scheduled failure path. CI runs this suite.

For remote acceptance, set `COST_MONITOR_URL` to the isolated e2e Worker and
`MONITOR_ADMIN_TOKEN` privately. The same suite first collects real Cloudflare
analytics and sends clearly labelled rehearsal messages to the configured list.
Optionally set `COST_MONITOR_EVIDENCE` to a **private, git-ignored** output file.
Confirm those message IDs are delivered in Email Service logs, then clean up the
e2e Worker. Never run synthetic scenarios against the production Worker.

## 可读告警与关键功能

邮件按严重程度排序，区分账单风险、运行错误、性能/用量异常、关键功能故障；显示北京时间、资源名称与持续同速的小时/日费用估算。估算未扣套餐额度，不等于最终账单。DO/KV/R2/Queues 的分母是整个账户 Worker 请求量，不能理解为单个资源的 SQL 查询次数。

相对基线异常同时要求窗口套餐外估算达到 $0.05/小时才预警，$0.50/小时才允许按十倍放大升级严重告警，避免低基线、少量读写产生严重邮件。D1 查询放大、CPU、错误和功能故障独立阈值继续生效，不能因为费用小而被屏蔽。Workers 运行错误持续两个窗口预警，错误率至少 5% 且至少一次错误立即严重告警。

API production 通过 Tail Worker 向监控写入固定功能名的五分钟聚合计数，覆盖 README 大卡/迷你卡/徽章、首页分析、锐评。锐评读取已有 `roast.summary` 结果，能识别 HTTP 200 后的生成失败；用户自带模型配置失败和正常 4xx 不计为网站故障。单次已观测关键功能服务端失败立即将该窗口判为严重；两次有真实成功调用的有效窗口后恢复。没有流量不代表恢复。流式请求结束后才能收到 Tail；加上指标等待上报，邮件通常延迟约 10–15 分钟。

每五分钟额外 GET 首页及 torvalds 的大卡/迷你卡，检查 HTTP 和 Content-Type；连续两个窗口失败预警，连续两个有效正常窗口恢复。探测不执行新的 GitHub 分析或付费 LLM 生成。探测不证明每个用户卡片内容都正确，也不验证完整锐评内容质量。计数只保存功能、时间和数量，不存用户名、URL、请求体、原始日志或密钥；24 小时清理。Tail 可能重复投递，计数是观测数量，不是财务账单。

发布顺序要求先部署监控 Tail consumer，再部署 API producer。两个生产 workflow 均仅在 main CI 成功后发布；API workflow 增加 consumer 先行部署以避免首次上线竞争。现有邮件收件人私密配置保持不变。

普通用量、性能、运行错误、持续提醒及非业务恢复信息改为每小时聚合一封；关键功能严重错误、账户严重消耗速度和严重日费用首次发生或升级时绕过摘要等待。部分收件人失败保留重试，已接受的摘要收件人不重复发送。正常排队等待摘要不算监控故障；独立 GitHub 心跳检查每小时运行。关键功能恢复静默，客户端断开不计业务故障。
