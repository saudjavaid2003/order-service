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


8 also check if the payment mode is cash then dont redirect it
solution i am doing for that is if the payment url is null in the repsosne then i will not redirect him 



ek aur chz ab kerni paray ghi webhook recieve kerni ha 
payment successful honay per


 todo 
 wo getmyorders ka endpoint banana ha 
ek czh ha wo ya ha kay customer jo wo user say connected ha auth servive walay sya yani customer collection kay ender userId ha to ma kia kaorun gha 
ma nay jwt token kay ender userId to dhali hoi ha wahan say req.auth say id lay ker jaoun gha aur orders nikal loun gha 
yahan per pagination laghani ha lekin wo end per karian ghay 
abhi full working project dikhana ha sir ko cart ko response may nai bhejna 
gend mach jay gha frontend per



10 
now i am going to make single order endpoint for that what i will do the logic is that everyone can acess that route but the manager who is realted to taht specific order cna acess it no other manager iwll so i also have to extract tenantId FORM auth token and 
if(order.tenantId==tenantID)
okay;
isko to frontend per bhi kerna paray gha 
bohat zayada if lagha di hain bad may sahi karoun gha 
