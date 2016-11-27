# bike-list
Senior Project
![Screenshot](https://github.com/zvakanaka/bike-list/raw/service-worker/screenshot/screenshot.jpg)  

```sh
npm install
bower install
gulp
```  
### System Dependencies
`ssmtp`

## Env Setup
Must have a file in root named `.env`  
Required variables:  
```sh
EMAIL_FROM='soandso@whateva.com'
EMAIL_PASSWORD='password'
EMAIL_TO='Ady <555@text.republicwireless.com>, Jo <555@tmomail.net>'
MONGO_URI='mongodb://heroku_blablablablabla'
GOOGLE_CLIENT_ID='blablablabla'
GOOGLE_CLIENT_SECRET='whodei-wannaseeDisNow'
```  
`MONGO_URI` can be set up through [mLab](https://mlab.com/)  
Read into google authentication with passport [here](http://mherman.org/blog/2013/11/10/social-authentication-with-passport-dot-js/)  

Optional variables:  
```sh
NO_SEND_MAIL=true
PORT=4000
NODE_ENV=dev
SUB_APP=true
OUTER_APP_DIR='../../howtoterminal-express'
BROWSER='firefox'
```  

 Endpoints | Method | Description | Auth Needed
--- | ---
my-list  | GET | List all active items of current user | Yes
list      | GET | List all active items for all users | Yes
/ | GET | Either log in or deliver offline add-scrape form | No*
account | GET | Manage account (buttons) | Yes
add-scrape | GET | Add a scrape | Yes
auth/google | GET | Authenticate with Passport and Google | No
/auth/google/callback | GET | What happens after authentication (redirect to /add-scrape) | Yes
/logout | GET | Log out and redirect to / | No
/db/all | GET | Return JSON of every item in the database (deleted or not) | No**
/new-scrape | POST | Insert a scrape to a site | No*
/manage-scrapes | GET | See list of scrapes and click to get /scrape-details | Yes
/scrape-details | GET | See details of clicked scrape ^^^ and show delete button | Yes
/db/reset | GET | delete all items | No*
/db/delete-scrape | GET | Delete scrape in query string (?id=) | Yes
/db/delete-my-items | GET | Delete a user's items (?id=)| Yes
/db/delete-scrapes | GET | Delete scrapes for a user (?id=) | Yes
/db/my-scrapes | GET | Get the scrapes of a user in JSON | Yes
/db/all-active-scrapes | GET | Get all active scrapes for all users | No
/db/delete-all-scrapes | GET | Delete all scrapes for all users | Yes
/scrape | GET | Collect new data from all scrapes again | No


\* FIX this!  
\*\* Possibly fix this  
