# tik


### [func] simple kick

```
poolManager.kickConnection('work-pool', 'conn123');
```


### [func] Kick with Ban

/admin/kick

```
poolManager.kickConnection('work-pool', 'conn123', {
  banClient: true,
  banDuration: 24 * 60 * 60 * 1000, // 24 hours
  reason: "Violating usage policy"
});
// Returns: { success: true, banned: true, message: "Connection conn123 kicked from pool work-pool and banned" }
```


### [api] Kick with Temporary Ban (1 hour)

/admin/kick

```
{
  "poolId": "work",
  "connectionId": "78f5504f-435b-4c37-94b4-500d0086c852",
  "ban": true,
  "banDurationMs": 3600000, // 1 hour in milliseconds
  "reason": "Violation of usage policy - temporary suspension"
}
```

### [api] Kick with Permanent Ban

/admin/kick

```
{
  "poolId": "work",
  "connectionId": "f30701a0-bd29-425f-821c-36d33160f696",
  "ban": true,
  "reason": "Repeated violations - permanent ban"
}
```