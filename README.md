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

### [desc] что будет отдавать

```
{
  d: number,
  t: number,
}
```
t (tick) - текущий тик (время со старта pool'а)
d (data) - хэш с¢остояния приложений,
кажому ремоуту присваивается числовой идентификатор.
Эта мэпа хранится в рантайме.
Нет необходимости держать ее где-то еще:
- после перезагрузки нужно вычислить рабочие ремоуты и раздать номера.
- сам стрим разорвется и подключится заново.

000010020031041
00: 0
01: 0
02: 0
03: 1
04: 1
xx - идентификатор ремоута
х - значение хэша. не обязательно делать это сложно, можно сравнивать упрощенное последнее значение и менять его при изменениях (boolean).

кто и когда собирает мэпу?
тик инициирует сбор.
ремоуты предают состояние, которое кладется в мапу тика.
тик кэширует его. 
! кэшировать можно не само состояние, а дату его изменения.
и когда это что-то в мапе не совпадает с тем, что пришло с бэка тика - отправляется ивент с обновлением конфига ремоута
как ремоуты подпишутся на поток?
кому-то нужны изменения каждую секунду, а кому-то только изменение хэша

todo:
1
OuterEventsStateController.getEventsState()
добавить параметр, уточняющий, какие события нужны от ремоута.
2
Добавить метод для обновления законченного события на ремут бэке
3
v3: добавить регистрацию роута для шаринга состояния законченного события в ремоут