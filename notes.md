making this service idempotent 

cause if for any reasosn user hit the creaate order endpoint twoce then we should not charge him twice or thrice for the same order right 

and there is also a big issue of tan stack query it retries 

we make  a  unique key uuid + userId and send it throguh headers 
from then db will save alogn with the response if for some same order comes again we will check the db if with the same key same orders is there we will just return 

// todo should we sent the idempotency key with headers ya bhen cho sochna paray gha 


// aur usko clear bhi kerna ha 
use karain ghay ttl index takay kuch time bad delete ho jay 24 hours shaid
// also have to implement transaction

1 create order 
2 call stripe for payment link 
3 add the payment link in the resposne 
4 redirect the user to that payment link
if scccuess redirect to success page with the a toast message 
5then we will get a webhook alogn with orderId then we will change the order status 
6 and then push the message to kafka broker for consumer s
7 consumers will be notification service and web sockets service 
