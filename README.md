### Run:
```bash
echo "SK=0xabc...">.env
source .env
yarn dev
```
### Send request

```bash
curl -H  'Content-type: application/json' -d @request.json  http://localhost:8081/proveTx
```
