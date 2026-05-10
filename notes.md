making this service idempotent 

cause if for any reasosn user hit the creaate order endpoint twoce then we should not charge him twice or thrice for the same order right 

and there is also a big issue of tan stack query it retries 

we make  a  unique key uuid + userId and send it throguh headers 
from then db will save alogn with the response if for some same order comes again we will check the db if with the same key same orders is there we will just return 

// todo should we sent the idempotency key with headers ya bhen cho sochna paray gha 


// aur usko clear bhi kerna ha 
use karain ghay ttl index takay kuch time bad delete ho jay 24 hours shaid
// also have to implement transaction

