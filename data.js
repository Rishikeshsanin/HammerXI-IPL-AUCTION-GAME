export const FRANCHISES = [
  { id:'csk', name:'Chennai Super Kings', short:'CSK', colors:['#f7c948','#f8e08e'], mark:'CS' },
  { id:'dc', name:'Delhi Capitals', short:'DC', colors:['#2563eb','#ef4444'], mark:'DC' },
  { id:'gt', name:'Gujarat Titans', short:'GT', colors:['#183b67','#59c3c3'], mark:'GT' },
  { id:'kkr', name:'Kolkata Knight Riders', short:'KKR', colors:['#5b21b6','#f0c75e'], mark:'KR' },
  { id:'lsg', name:'Lucknow Super Giants', short:'LSG', colors:['#25a9e0','#f97316'], mark:'LS' },
  { id:'mi', name:'Mumbai Indians', short:'MI', colors:['#1769aa','#d4af37'], mark:'MI' },
  { id:'pbks', name:'Punjab Kings', short:'PBKS', colors:['#ef3340','#d7d7d7'], mark:'PK' },
  { id:'rr', name:'Rajasthan Royals', short:'RR', colors:['#e83e8c','#2563eb'], mark:'RR' },
  { id:'rcb', name:'Royal Challengers Bengaluru', short:'RCB', colors:['#d71920','#111827'], mark:'RC' },
  { id:'srh', name:'Sunrisers Hyderabad', short:'SRH', colors:['#f97316','#111827'], mark:'SH' }
];

export const LOGO_PRESETS = [
  ['volt','Volt Kings','VK',['#d9a928','#19140b']], ['onyx','Onyx Guard','OG',['#c7cbd1','#151719']],
  ['nova','Nova XI','NX',['#6b4bbf','#171129']], ['apex','Apex','AX',['#c94b32','#21110d']],
  ['royal','Royal Crest','RC',['#8f67c9','#1c1326']], ['comet','Comet Club','CC',['#3f7e9b','#0f1c22']],
  ['forge','The Forge','FG',['#bd5f2c','#21120a']], ['zenith','Zenith','ZN',['#2f8c78','#0c1e18']],
  ['phantom','Phantom','PH',['#73618c','#121015']], ['solar','Solar XI','SX',['#d59c2f','#261b08']],
  ['lunar','Lunar Club','LC',['#657493','#111722']], ['blaze','Blaze','BZ',['#c94135','#250d0b']],
  ['viper','Viper XI','VX',['#4b9b58','#0d1d11']], ['storm','Storm','ST',['#4c7395','#0e1821']],
  ['titan','Titan Club','TN',['#4d669e','#111625']], ['sabre','Sabre','SB',['#9b3546','#230d12']],
  ['orbit','Orbit XI','OX',['#456da9','#111828']], ['prism','Prism','PX',['#99608d','#22121f']],
  ['ember','Ember','EM',['#be6a2b','#281509']], ['atlas','Atlas XI','AT',['#3f8173','#0d1d19']],
  ['vector','Vector','VT',['#3f7f94','#101b20']], ['omen','Omen','OM',['#9a3333','#210c0c']],
  ['infinity','Infinity','IF',['#6e4f97','#17101f']], ['delta','Delta','DL',['#3b7f86','#0f1c1d']],
  ['eclipse','Eclipse','EC',['#a27835','#211708']], ['crown','Crown XI','CX',['#9f3e36','#24100c']],
  ['spark','Spark','SP',['#4d7f9d','#111c24']], ['hex','Hex Club','HX',['#5c699f','#141727']],
  ['frost','Frost XI','FX',['#5f8496','#111b20']], ['pulse','Pulse','PL',['#8d557a','#20131c']]
].map(([id,name,symbol,colors])=>({id,name,symbol,colors}));

const star = {
  'Virat Kohli':99,'Jasprit Bumrah':99,'Suryakumar Yadav':97,'Shubman Gill':96,'Rohit Sharma':96,
  'Rashid Khan':97,'Rishabh Pant':96,'Nicholas Pooran':95,'Travis Head':95,'Heinrich Klaasen':95,
  'Hardik Pandya':95,'Jos Buttler':95,'KL Rahul':94,'Shreyas Iyer':94,'Sanju Samson':94,
  'Ravindra Jadeja':94,'Sunil Narine':94,'Mitchell Starc':93,'Pat Cummins':93,'Abhishek Sharma':93,
  'Yashasvi Jaiswal':93,'Kuldeep Yadav':92,'Mohammed Siraj':91,'Josh Hazlewood':91,'Rinku Singh':91,
  'Axar Patel':91,'Varun Chakaravarthy':90,'Tilak Varma':90,'N. Tilak Varma':90,'Ruturaj Gaikwad':90,
  'MS Dhoni':89,'Phil Salt':89,'Cameron Green':89,'Mitchell Marsh':89,'Marco Jansen':88,
  'Arshdeep Singh':90,'Yuzvendra Chahal':88,'Trent Boult':89,'Kagiso Rabada':88,'Jofra Archer':88,
  'Sai Sudharsan':89,'Riyan Parag':87,'Nitish Kumar Reddy':87,'Shivam Dube':87,'David Miller':86,
  'Aiden Markram':85,'Wanindu Hasaranga':86,'Prasidh Krishna':84,'Washington Sundar':84,'Tim David':85,
  'Venkatesh Iyer':85,'Rachin Ravindra':86,'Quinton de Kock':87,'Ishan Kishan':87,'Prabhsimran Singh':84,
  'Shashank Singh':84,'Krunal Pandya':83,'Bhuvneshwar Kumar':84,'Deepak Chahar':82,'Ravi Bishnoi':86,
  'Mayank Yadav':84,'Rajat Patidar':86,'Jitesh Sharma':82,'Shimron Hetmyer':82,'Noor Ahmad':83,
  'Glenn Phillips':83,'Will Jacks':84,'Marcus Stoinis':85,'Josh Inglis':83,'Ayush Badoni':81,
  'Shahrukh Khan':80,'Rahul Tewatia':81,'Harshal Patel':82,'Rovman Powell':81,'Devdutt Padikkal':80,
  'Vaibhav Sooryavanshi':83,'Dewald Brevis':81,'Mathew Short':79,'Matthew William Short':79,
  'Lockie Ferguson':81,'Anrich Nortje':81,'Gerald Coetzee':80,'Liam Livingstone':84,'Romario Shepherd':80
};

const TEAM_SQUADS = {
  CSK: [
    ['Ruturaj Gaikwad','BAT',false],['MS Dhoni','WK',false],['Sanju Samson','WK',false],['Shivam Dube','AR',false],['Dewald Brevis','BAT',true],
    ['Noor Ahmad','BOWL',true],['Anshul Kamboj','BOWL',false],['Mukesh Choudhary','BOWL',false],['Shreyas Gopal','BOWL',false],['Gurjapneet Singh','BOWL',false],
    ['Akeal Hosein','BOWL',true],['Prashant Veer','AR',false],['Kartik Sharma','WK',false],['Matthew William Short','AR',true],['Aman Khan','AR',false],
    ['Sarfaraz Khan','BAT',false],['Matt Henry','BOWL',true],['Rahul Chahar','BOWL',false],['Zak Foulkes','AR',true],['Spencer Johnson','BOWL',true],
    ['Akash Madhwal','BOWL',false],['Macneil Noronha','AR',false],['Dian Forrester','AR',true],['Kuldip Yadav','BOWL',false],['Urvil Patel','WK',false]
  ],
  DC: [
    ['Axar Patel','AR',false],['Mitchell Starc','BOWL',true],['KL Rahul','WK',false],['T. Natarajan','BOWL',false],['Kuldeep Yadav','BOWL',false],
    ['Karun Nair','BAT',false],['Sameer Rizvi','AR',false],['Ashutosh Sharma','AR',false],['Mukesh Kumar','BOWL',false],['Vipraj Nigam','AR',false],
    ['Dushmantha Chameera','BOWL',true],['Ajay Mandal','AR',false],['Tripurana Vijay','AR',false],['Madhav Tiwari','AR',false],['David Miller','BAT',true],
    ['Auqib Nabi','BOWL',false],['Pathum Nissanka','BAT',true],['Lungi Ngidi','BOWL',true],['Sahil Parakh','BAT',false],['Prithvi Shaw','BAT',false],
    ['Kyle Jamieson','BOWL',true],['Rehan Ahmed','BOWL',true],['Nitish Rana','AR',false],['Abishek Porel','WK',false],['Tristan Stubbs','WK',true]
  ],
  GT: [
    ['Shubman Gill','BAT',false],['Jos Buttler','WK',true],['Kagiso Rabada','BOWL',true],['Mohammed Siraj','BOWL',false],['Prasidh Krishna','BOWL',false],
    ['Sai Sudharsan','BAT',false],['Rashid Khan','BOWL',true],['Rahul Tewatia','AR',false],['Shahrukh Khan','AR',false],['Washington Sundar','AR',false],
    ['Glenn Phillips','BAT',true],['Nishant Sindhu','AR',false],['Kumar Kushagra','WK',false],['Anuj Rawat','WK',false],['Manav Suthar','BOWL',false],
    ['Mohd. Arshad Khan','AR',false],['Gurnoor Singh Brar','BOWL',false],['Sai Kishore','AR',false],['Ishant Sharma','BOWL',false],['Jayant Yadav','AR',false],
    ['Ashok Sharma','BOWL',false],['Jason Holder','AR',true],['Tom Banton','WK',true],['Luke Wood','BOWL',true],['Kulwant Khejroliya','BOWL',false]
  ],
  KKR: [
    ['Ajinkya Rahane','BAT',false],['Rinku Singh','BAT',false],['Sunil Narine','AR',true],['Varun Chakaravarthy','BOWL',false],['Cameron Green','AR',true],
    ['Rovman Powell','BAT',true],['Rachin Ravindra','AR',true],['Finn Allen','WK',true],['Rahul Tripathi','BAT',false],['Ramandeep Singh','AR',false],
    ['Blessing Muzarabani','BOWL',true],['Angkrish Raghuvanshi','BAT',false],['Vaibhav Arora','BOWL',false],['Manish Pandey','BAT',false],['Anukul Roy','AR',false],
    ['Tejasvi Singh','WK',false],['Kartik Tyagi','BOWL',false],['Prashant Solanki','BOWL',false],['Tim Seifert','WK',true],['Sarthak Ranjan','AR',false],
    ['Daksh Kamra','AR',false],['Saurabh Dubey','BOWL',false],['Navdeep Saini','BOWL',false],['Luvnith Sisodia','WK',false],['Umran Malik','BOWL',false]
  ],
  LSG: [
    ['Rishabh Pant','WK',false],['Nicholas Pooran','WK',true],['Mitchell Marsh','AR',true],['Aiden Markram','BAT',true],['Mohammad Shami','BOWL',false],
    ['Ravi Bishnoi','BOWL',false],['Mayank Yadav','BOWL',false],['Ayush Badoni','AR',false],['Avesh Khan','BOWL',false],['Abdul Samad','AR',false],
    ['Himmat Singh','BAT',false],['M. Siddharth','BOWL',false],['Digvesh Singh','BOWL',false],['Shahbaz Ahmed','AR',false],['Akash Singh','BOWL',false],
    ['Prince Yadav','BOWL',false],['Arshin Kulkarni','AR',false],['Matthew Breetzke','BAT',true],['Arjun Tendulkar','BOWL',false],['Wanindu Hasaranga','AR',true],
    ['Anrich Nortje','BOWL',true],['Mukul Choudhary','WK',false],['Naman Tiwari','BOWL',false],['Akshat Raghuwanshi','BAT',false],['Josh Inglis','WK',true]
  ],
  MI: [
    ['Jasprit Bumrah','BOWL',false],['Hardik Pandya','AR',false],['Rohit Sharma','BAT',false],['Suryakumar Yadav','BAT',false],['N. Tilak Varma','BAT',false],
    ['Trent Boult','BOWL',true],['Will Jacks','AR',true],['Quinton de Kock','WK',true],['Deepak Chahar','BOWL',false],['Keshav Maharaj','BOWL',true],
    ['Naman Dhir','AR',false],['Robin Minz','WK',false],['Mayank Markande','BOWL',false],['Sherfane Rutherford','BAT',true],['Ashwani Kumar','BOWL',false],
    ['Raj Angad Bawa','AR',false],['Raghu Sharma','BOWL',false],['Ryan Rickelton','WK',true],['Danish Malewar','BAT',false],['Mohammad Izhar','BOWL',false],
    ['Mayank Rawat','AR',false],['Krish Bhagat','AR',false],['Mahipal Lomror','AR',false],['Ruchit Ahir','WK',false],['Allah Ghazanfar','BOWL',true],
    ['Corbin Bosch','AR',true],['Shardul Thakur','AR',false]
  ],
  PBKS: [
    ['Shreyas Iyer','BAT',false],['Arshdeep Singh','BOWL',false],['Yuzvendra Chahal','BOWL',false],['Marcus Stoinis','AR',true],['Marco Jansen','AR',true],
    ['Prabhsimran Singh','WK',false],['Shashank Singh','BAT',false],['Nehal Wadhera','BAT',false],['Harpreet Brar','AR',false],['Vishnu Vinod','WK',false],
    ['Vyshak Vijaykumar','BOWL',false],['Yash Thakur','BOWL',false],['Azmatullah Omarzai','AR',true],['Harnoor Pannu','BAT',false],['Priyansh Arya','AR',false],
    ['Musheer Khan','AR',false],['Suryansh Shedge','AR',false],['Xavier Bartlett','BOWL',true],['Pyla Avinash','BAT',false],['Mitch Owen','AR',true],
    ['Cooper Connolly','AR',true],['Ben Dwarshuis','AR',true],['Pravin Dubey','BOWL',false],['Vishal Nishad','BOWL',false],['Lockie Ferguson','BOWL',true]
  ],
  RR: [
    ['Yashasvi Jaiswal','BAT',false],['Ravindra Jadeja','AR',false],['Riyan Parag','AR',false],['Dhruv Jurel','WK',false],['Jofra Archer','BOWL',true],
    ['Shimron Hetmyer','BAT',true],['Vaibhav Sooryavanshi','BAT',false],['Ravi Bishnoi','BOWL',false],['Tushar Deshpande','BOWL',false],['Shubham Dubey','BAT',false],
    ['Yudhvir Singh Charak','AR',false],['Donovan Ferreira','WK',true],['Kwena Maphaka','BOWL',true],['Lhuan-dre Pretorius','WK',true],['Sushant Mishra','BOWL',false],
    ['Yash Raj Punja','BOWL',false],['Vignesh Puthur','BOWL',false],['Aman Rao Perala','BAT',false],['Brijesh Sharma','BOWL',false],['Adam Milne','BOWL',true],
    ['Kuldeep Sen','BOWL',false],['Emanjot Chahal','AR',false],['Sandeep Sharma','BOWL',false],['Dasun Shanaka','AR',true],['Nandre Burger','BOWL',true]
  ],
  RCB: [
    ['Virat Kohli','BAT',false],['Rajat Patidar','BAT',false],['Phil Salt','WK',true],['Josh Hazlewood','BOWL',true],['Jitesh Sharma','WK',false],
    ['Krunal Pandya','AR',false],['Bhuvneshwar Kumar','BOWL',false],['Tim David','AR',true],['Romario Shepherd','AR',true],['Venkatesh Iyer','AR',false],
    ['Devdutt Padikkal','BAT',false],['Rasikh Dar','BOWL',false],['Suyash Sharma','BOWL',false],['Swapnil Singh','AR',false],['Abhinandan Singh','BOWL',false],
    ['Jacob Bethell','AR',true],['Jacob Duffy','BOWL',true],['Satvik Deswal','AR',false],['Mangesh Yadav','AR',false],['Jordan Cox','WK',true],
    ['Vicky Ostwal','AR',false],['Vihaan Malhotra','AR',false],['Kanishk Chouhan','AR',false],['Richard Gleeson','BOWL',true],['Yash Dayal','BOWL',false]
  ],
  SRH: [
    ['Pat Cummins','BOWL',true],['Travis Head','BAT',true],['Heinrich Klaasen','WK',true],['Abhishek Sharma','AR',false],['Nitish Kumar Reddy','AR',false],
    ['Ishan Kishan','WK',false],['Liam Livingstone','AR',true],['Harshal Patel','AR',false],['Zeeshan Ansari','BOWL',false],['Jaydev Unadkat','BOWL',false],
    ['Kamindu Mendis','AR',true],['Aniket Verma','BAT',false],['Eshan Malinga','BOWL',true],['Smaran Ravichandran','BAT',false],['Harsh Dubey','AR',false],
    ['Shivang Kumar','AR',false],['Salil Arora','WK',false],['Sakib Hussain','BOWL',false],['Onkar Tarmale','BOWL',false],['Amit Kumar','BOWL',false],
    ['Praful Hinge','BOWL',false],['Krains Fuletra','AR',false],['Dilshan Madushanka','BOWL',true],['Gerald Coetzee','BOWL',true],['R.S Ambrish','AR',false]
  ]
};

const hash = s => [...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,2166136261);
const baseFromRating = r => r >= 90 ? 2 : r >= 85 ? 1.5 : r >= 80 ? 1.25 : r >= 75 ? 1 : r >= 68 ? .75 : r >= 62 ? .5 : r >= 58 ? .4 : .3;

export const PLAYERS = Object.entries(TEAM_SQUADS).flatMap(([originalTeam, rows]) => rows.map(([name, role, overseas], i) => {
  const rating = star[name] ?? Math.min(79, 56 + (hash(name) % 20));
  return {
    id: `${originalTeam}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
    name, role, overseas, originalTeam, rating,
    basePrice: baseFromRating(rating),
    nation: overseas ? 'Overseas' : 'India'
  };
})).filter((p,i,arr)=>arr.findIndex(x=>x.name===p.name)===i);

export const POOL_SIZE_BY_TEAMS = {2:50,3:70,4:95,5:115,6:140,7:160,8:185,9:210,10:235};
export const ROLE_LABEL = {BAT:'Batter',WK:'Wicketkeeper',AR:'All-rounder',BOWL:'Bowler'};
