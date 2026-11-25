/**
 * States / union territories of India and their districts (36, 784 districts).
 * Source: github.com/KTBsomen/Indian-state-district-json (MIT, scraped from igod.gov.in), fetched 2026-11-20.
 * State codes follow ISO 3166-2:IN. District codes are "<STATE>-<NAME_SLUG>", e.g. "MH-LATUR" (names repeat across states).
 * shortcut: static snapshot; refresh from the Local Government Directory (lgdirectory.gov.in) when districts change.
 */
export type IndiaState = { code: string; name: string; districts: readonly string[] };

export const INDIA_STATES: readonly IndiaState[] = [
  { code: "AN", name: "Andaman and Nicobar Islands", districts: ["Nicobars","North And Middle Andaman","South Andamans"] },
  { code: "AP", name: "Andhra Pradesh", districts: ["Alluri Sitharama Raju","Anakapalli","Ananthapuramu","Annamayya","Bapatla","Chittoor","Dr. B.R. Ambedkar Konaseema","East Godavari","Eluru","Guntur","Kakinada","Krishna","Kurnool","Markapuram","Nandyal","Ntr","Palnadu","Parvathipuram Manyam","Polavaram","Prakasam","Sri Potti Sriramulu Nellore","Sri Sathya Sai","Srikakulam","Tirupati","Visakhapatnam","Vizianagaram","West Godavari","Y.S.R. Kadapa"] },
  { code: "AR", name: "Arunachal Pradesh", districts: ["Anjaw","Bichom","Changlang","Dibang Valley","East Kameng","East Siang","Kamle","Keyi Panyor","Kra Daadi","Kurung Kumey","Leparada","Lohit","Longding","Lower Dibang Valley","Lower Siang","Lower Subansiri","Namsai","Pakke Kessang","Papum Pare","Shi Yomi","Siang","Tawang","Tirap","Upper Siang","Upper Subansiri","West Kameng","West Siang"] },
  { code: "AS", name: "Assam", districts: ["Bajali","Baksa","Barpeta","Biswanath","Bongaigaon","Cachar","Charaideo","Chirang","Darrang","Dhemaji","Dhubri","Dibrugarh","Dima Hasao","Goalpara","Golaghat","Hailakandi","Hojai","Jorhat","Kamrup","Kamrup Metro","Karbi Anglong","Kokrajhar","Lakhimpur","Majuli","Marigaon","Nagaon","Nalbari","Sivasagar","Sonitpur","South Salmara Mancachar","Sribhumi","Tamulpur","Tinsukia","Udalguri","West Karbi Anglong"] },
  { code: "BR", name: "Bihar", districts: ["Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur (Bhabua)","Katihar","Khagaria","Kishanganj","Lakhisarai","Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Pashchim Champaran","Patna","Purbi Champaran","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sheohar","Sitamarhi","Siwan","Supaul","Vaishali"] },
  { code: "CH", name: "Chandigarh", districts: ["Chandigarh"] },
  { code: "CT", name: "Chhattisgarh", districts: ["Balod","Balodabazar-Bhatapara","Balrampur-Ramanujganj","Bastar","Bemetara","Bijapur","Bilaspur","Dakshin Bastar Dantewada","Dhamtari","Durg","Gariyaband","Gaurela-Pendra-Marwahi","Janjgir-Champa","Jashpur","Kabeerdham","Khairagarh-Chhuikhadan-Gandai","Kondagaon","Korba","Korea","Mahasamund","Manendragarh-Chirmiri-Bharatpur(M C B)","Mohla-Manpur-Ambagarh Chouki","Mungeli","Narayanpur","Raigarh","Raipur","Rajnandgaon","Sakti","Sarangarh-Bilaigarh","Sukma","Surajpur","Surguja","Uttar Bastar Kanker"] },
  { code: "DH", name: "Dadra and Nagar Haveli and Daman and Diu", districts: ["Dadra And Nagar Haveli","Daman","Diu"] },
  { code: "DL", name: "Delhi", districts: ["Central","Central North","East","New Delhi","North","North East","North West","Old Delhi","Outer North","South","South East","South West","West"] },
  { code: "GA", name: "Goa", districts: ["Kushavati","North Goa","South Goa"] },
  { code: "GJ", name: "Gujarat", districts: ["Ahmedabad","Amreli","Anand","Arvalli","Banas Kantha","Bharuch","Bhavnagar","Botad","Chhotaudepur","Dahod","Dangs","Devbhumi Dwarka","Gandhinagar","Gir Somnath","Jamnagar","Junagadh","Kachchh","Kheda","Mahesana","Mahisagar","Morbi","Narmada","Navsari","Panch Mahals","Patan","Porbandar","Rajkot","Sabar Kantha","Surat","Surendranagar","Tapi","Vadodara","Valsad","Vav-Tharad"] },
  { code: "HR", name: "Haryana", districts: ["Ambala","Bhiwani","Charkhi Dadri","Faridabad","Fatehabad","Gurugram","Hansi","Hisar","Jhajjar","Jind","Kaithal","Karnal","Kurukshetra","Mahendragarh","Nuh","Palwal","Panchkula","Panipat","Rewari","Rohtak","Sirsa","Sonipat","Yamunanagar"] },
  { code: "HP", name: "Himachal Pradesh", districts: ["Bilaspur","Chamba","Hamirpur","Kangra","Kinnaur","Kullu","Lahaul And Spiti","Mandi","Shimla","Sirmaur","Solan","Una"] },
  { code: "JK", name: "Jammu and Kashmir", districts: ["Anantnag","Bandipora","Baramulla","Budgam","Doda","Ganderbal","Jammu","Kathua","Kishtwar","Kulgam","Kupwara","Poonch","Pulwama","Rajouri","Ramban","Reasi","Samba","Shopian","Srinagar","Udhampur"] },
  { code: "JH", name: "Jharkhand", districts: ["Bokaro","Chatra","Deoghar","Dhanbad","Dumka","East Singhbum","Garhwa","Giridih","Godda","Gumla","Hazaribagh","Jamtara","Khunti","Koderma","Latehar","Lohardaga","Pakur","Palamu","Ramgarh","Ranchi","Sahebganj","Saraikela Kharsawan","Simdega","West Singhbhum"] },
  { code: "KA", name: "Karnataka", districts: ["Bagalkote","Ballari","Belagavi","Bengaluru Rural","Bengaluru South","Bengaluru Urban","Bidar","Chamarajanagar","Chikkaballapura","Chikkamagaluru","Chitradurga","Dakshina Kannada","Davanagere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar","Koppal","Mandya","Mysuru","Raichur","Shivamogga","Tumakuru","Udupi","Uttara Kannada","Vijayanagara","Vijayapura","Yadgir"] },
  { code: "KL", name: "Kerala", districts: ["Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam","Kottayam","Kozhikode","Malappuram","Palakkad","Pathanamthitta","Thiruvananthapuram","Thrissur","Wayanad"] },
  { code: "LA", name: "Ladakh", districts: ["Kargil","Leh Ladakh"] },
  { code: "LD", name: "Lakshadweep", districts: ["Lakshadweep District"] },
  { code: "MP", name: "Madhya Pradesh", districts: ["Agar-Malwa","Alirajpur","Anuppur","Ashoknagar","Balaghat","Barwani","Betul","Bhind","Bhopal","Burhanpur","Chhatarpur","Chhindwara","Damoh","Datia","Dewas","Dhar","Dindori","Guna","Gwalior","Harda","Indore","Jabalpur","Jhabua","Katni","Khandwa (East Nimar)","Khargone (West Nimar)","Maihar","Mandla","Mandsaur","MAUGANJ","Morena","Narmadapuram","Narsimhapur","Neemuch","Niwari","Pandhurna","Panna","Raisen","Rajgarh","Ratlam","Rewa","Sagar","Satna","Sehore","Seoni","Shahdol","Shajapur","Sheopur","Shivpuri","Sidhi","Singrauli","Tikamgarh","Ujjain","Umaria","Vidisha"] },
  { code: "MH", name: "Maharashtra", districts: ["Ahilyanagar","Akola","Amravati","Beed","Bhandara","Buldhana","Chandrapur","Chhatrapati Sambhajinagar","Dharashiv","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal"] },
  { code: "MN", name: "Manipur", districts: ["Bishnupur","Chandel","Churachandpur","Imphal East","Imphal West","Jiribam","Kakching","Kamjong","Kangpokpi","Noney","Pherzawl","Senapati","Tamenglong","Tengnoupal","Thoubal","Ukhrul"] },
  { code: "ML", name: "Meghalaya", districts: ["East Garo Hills","East Jaintia Hills","East Khasi Hills","Eastern West Khasi Hills","North Garo Hills","Ri Bhoi","South Garo Hills","South West Garo Hills","South West Khasi Hills","West Garo Hills","West Jaintia Hills","West Khasi Hills"] },
  { code: "MZ", name: "Mizoram", districts: ["Aizawl","Champhai","Hnahthial","Khawzawl","Kolasib","Lawngtlai","Lunglei","Mamit","Saitual","Serchhip","Siaha"] },
  { code: "NL", name: "Nagaland", districts: ["Chumoukedima","Dimapur","Kiphire","Kohima","Longleng","Meluri","Mokokchung","Mon","Niuland","Noklak","Peren","Phek","Shamator","Tseminyu","Tuensang","Wokha","Zunheboto"] },
  { code: "OD", name: "Odisha", districts: ["Anugola","Balangir","Baleshwar","Baragada","Bhadrak","Boudh","Debagada","Dhenkanal","Gajapati","Ganjam","Jagatsinghapur","Jajpur","Jharsuguda","Kalahandi","Kandhamala","Kataka","Kendrapada","Kendujhar","Khordha","Koraput","Malkangiri","Mayurbhanj","Nabarangpur","Nayagada","Nuapada","Puri","Rayagada","Sambalpur","Subarnapur","Sundaragada"] },
  { code: "PY", name: "Puducherry", districts: ["Karaikal","Puducherry"] },
  { code: "PB", name: "Punjab", districts: ["Amritsar","Barnala","Bathinda","Faridkot","Fatehgarh Sahib","Fazilka","Ferozepur","Gurdaspur","Hoshiarpur","Jalandhar","Kapurthala","Ludhiana","Malerkotla","Mansa","Moga","Pathankot","Patiala","Rupnagar","S.A.S Nagar","Sangrur","Shahid Bhagat Singh Nagar","Sri Muktsar Sahib","Tarn Taran"] },
  { code: "RJ", name: "Rajasthan", districts: ["Ajmer","Alwar","Balotra","Banswara","Baran","Barmer","Beawar","Bharatpur","Bhilwara","Bikaner","Bundi","Chittorgarh","Churu","Dausa","Deeg","Dholpur","Didwana-Kuchaman","Dungarpur","Ganganagar","Hanumangarh","Jaipur","Jaisalmer","Jalore","Jhalawar","Jhunjhunu","Jodhpur","Karauli","Khairthal-Tijara","Kota","Kotputli-Behror","Nagaur","Pali","Phalodi","Pratapgarh","Rajsamand","Salumbar","Sawai Madhopur","Sikar","Sirohi","Tonk","Udaipur"] },
  { code: "SK", name: "Sikkim", districts: ["Gangtok","Gyalshing","Mangan","Namchi","Pakyong","Soreng"] },
  { code: "TN", name: "Tamil Nadu", districts: ["Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kallakurichi","Kancheepuram","Kanniyakumari","Karur","Krishnagiri","Madurai","Mayiladuthurai","Nagapattinam","Namakkal","Perambalur","Pudukkottai","Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi","Thanjavur","The Nilgiris","Theni","Thiruvallur","Thiruvarur","Thoothukkudi","Tiruchirappalli","Tirunelveli","Tirupathur","Tiruppur","Tiruvannamalai","Vellore","Viluppuram","Virudhunagar"] },
  { code: "TG", name: "Telangana", districts: ["Adilabad","Bhadradri Kothagudem","Hanumakonda","Hyderabad","Jagitial","Jangoan","Jayashankar Bhupalapally","Jogulamba Gadwal","Kamareddy","Karimnagar","Khammam","Kumuram Bheem Asifabad","Mahabubabad","Mahabubnagar","Mancherial","Medak","Medchal Malkajgiri","Mulugu","Nagarkurnool","Nalgonda","Narayanpet","Nirmal","Nizamabad","Peddapalli","Rajanna Sircilla","Ranga Reddy","Sangareddy","Siddipet","Suryapet","Vikarabad","Wanaparthy","Warangal","Yadadri Bhuvanagiri"] },
  { code: "TR", name: "Tripura", districts: ["Dhalai","Gomati","Khowai","North Tripura","Sepahijala","South Tripura","Unakoti","West Tripura"] },
  { code: "UP", name: "Uttar Pradesh", districts: ["Agra","Aligarh","Ambedkar Nagar","Amethi","Amroha","Auraiya","Ayodhya","Azamgarh","Baghpat","Bahraich","Ballia","Balrampur","Banda","Bara Banki","Bareilly","Basti","Bhadohi","Bijnor","Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah","Etawah","Farrukhabad","Fatehpur","Firozabad","Gautam Buddha Nagar","Ghaziabad","Ghazipur","Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur","Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi","Kheri","Kushinagar","Lalitpur","Lucknow","Mahoba","Mahrajganj","Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad","Muzaffarnagar","Pilibhit","Pratapgarh","Prayagraj","Rae Bareli","Rampur","Saharanpur","Sambhal","Sant Kabir Nagar","Shahjahanpur","Shamli","Shrawasti","Siddharthnagar","Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi"] },
  { code: "UK", name: "Uttarakhand", districts: ["Almora","Bageshwar","Chamoli","Champawat","Dehradun","Haridwar","Nainital","Pauri Garhwal","Pithoragarh","Rudraprayag","Tehri Garhwal","Udham Singh Nagar","Uttarkashi"] },
  { code: "WB", name: "West Bengal", districts: ["Alipurduar","Bankura","Birbhum","Cooch Behar","Dakshin Dinajpur","Darjeeling","Hooghly","Howrah","Jalpaiguri","Jhargram","Kalimpong","Kolkata","Malda","Murshidabad","Nadia","North 24 Parganas","Paschim Bardhaman","Paschim Medinipur","Purba Bardhaman","Purba Medinipur","Purulia","South 24 Parganas","Uttar Dinajpur"] },
];

export const districtCode = (stateCode: string, district: string) =>
  `${stateCode}-${district.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase()}`;

/** "MH-LATUR" -> { state, district: "Latur" }, or null when the code is not a real district. */
export function findDistrict(code: string) {
  const state = INDIA_STATES.find((s) => code.startsWith(`${s.code}-`));
  const district = state?.districts.find((d) => districtCode(state.code, d) === code);
  return state && district ? { state, district } : null;
}
/**
 * Cover eligibility by place. An entry is '*' (all of India), '<STATE>-*' (a whole state, e.g. "MH-*")
 * or one district code (e.g. "MH-LATUR").
 */
export function isPlaceEntry(entry: string): boolean {
  if (entry === '*') return true;
  if (entry.endsWith('-*')) return INDIA_STATES.some((s) => `${s.code}-*` === entry);
  return findDistrict(entry) !== null;
}

/** The entries that make a cover open to this district: itself, its whole state, or all of India. */
export function placeKeys(districtCode: string | null | undefined): string[] {
  if (!districtCode) return ['*'];
  const state = districtCode.split('-')[0];
  return [districtCode, `${state}-*`, '*'];
}
