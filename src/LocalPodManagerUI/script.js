/** @type {Pod[]} */
let pods = []

  // mot clef pour le cryptage et décryptage
  const key = 'my-key';

  // Fonction de crypatage des données en AES,
  // Avec données d'entrée en deux paramètres: l'information à crypter et la clef.
  // Et en sortie une infomation décrypter  
  const Cryptage=(string,key)=>{
    const informationCrypt = CryptoJS.AES.encrypt(string, key).toString();
    return informationCrypt;
  }

  // Fonction de décrypatage des données en AES,
  // Avec données d'entrée en deux paramètres: l'information à décrypter et la clef.
  // Et en sortie une infomation crypter 
  const Decryptage=(string,key)=>{
    const informationDecrypt = CryptoJS.AES.decrypt(string, key).toString(CryptoJS.enc.Utf8);
    return informationDecrypt;
  } 

async function main() {
    try {
        updatePods(await fetchPods());
        
        const form = document.getElementById('add_pod');
        form.onsubmit = e => {
            e.preventDefault()
            console.log('submit', e)
            const name = document.getElementById('pod_name').value
            const port = document.getElementById('port_number').value
            const basePath = document.getElementById('base_path').value

            addPod(new Pod(name, port, basePath, true))
        }
    } catch (err) {
        console.error(err)
        alert('Unexpected Error: ' + JSON.stringify(err))
    }

    const date1 = await (await fetch('/get_date')).json();

    let date = new Date(date1);
    let h = date.getHours();
    let mn = date.getMinutes();
    let s = date.getSeconds();
    function addZero(i) {
        return i < 10 ? i = '0' + i : i;
    }
    document.querySelector('#clock').innerHTML = addZero(h) + ':' + addZero(mn) + ':' + addZero(s);

    setInterval(()=>{
        s++;
        if (h==24){
            h=0;
        };
        if (s==60){
            s=0;
            mn++;
        };
        if (mn==60){
            mn=0;
            h++;
        };
        document.querySelector('#clock').innerHTML = addZero(h) + ':' + addZero(mn) + ':' + addZero(s);
    }, 1000);
}


async function fetchPods() {
    const res = await fetch('/get_pods')
    if (!res.ok) {
        throw new Error(res)
    }
    const data = await res.json()
    return data
}

// async function afficherDate() {
//     return await fetch('/get_date');
// }

function updatePods(fetchedPods) {
    pods = []
    fetchedPods.forEach(({ name, port, basePath, isActive }) => {
        pods.push(new Pod(name, port, basePath, isActive))
    })
    updateDisplay()
}

function updateDisplay() {
    if (!('content' in document.createElement('template'))) {
        alert('This webpage is is not supported by your browser')
        throw new Error('html template support required')
    }
    // Instantiate the table with the existing HTML tbody
    // and the row with the template
    const template = document.querySelector('#pod_entry')
    const tbody = document.querySelector("tbody")
    tbody.innerHTML = ''

    // Clone the new row and insert it into the table
    console.log(pods)
    pods.forEach(({ name, port, basePath, isActive }) => {
        const clone = document.importNode(template.content, true)
        const td = clone.querySelectorAll("td")
        td[0].textContent = name
        td[1].innerHTML = `<a target="_blank" href="https://localhost:${port}/">${port}</a>`
        td[2].textContent = basePath
        td[3].textContent = isActive ? 'Active' : 'Disabled'
        tbody.appendChild(clone);


        console.log(td[4].querySelectorAll('button'))
        const toggleButton = td[4].querySelectorAll('button')[0]
        const deleteButton = td[4].querySelectorAll('button')[1]
        toggleButton.addEventListener('click', e => setStatus(name, !isActive))
        deleteButton.addEventListener('click', e => deletePod(name))
    })
}

async function setStatus(name, status) {
    const endpoint = status ? '/activate_pod' : '/deactivate_pod'
    const res = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ name }),
        headers: {
            'content-type': 'application/json'
        }
    })
    if (!res.ok) {
        throw new Error(res)
    }
    pods.forEach(pod => {
        if (pod.name === name)
            pod.isActive = status
    })
    updateDisplay()
}

async function deletePod(name) {
    const res = await fetch('/delete_pod', {
        method: 'POST',
        body: JSON.stringify({ name }),
        headers: {
            'content-type': 'application/json'
        }
    })
    if (!res.ok) {
        throw new Error(res)
    }
    pods = pods.filter(pod => pod.name !== name)
    updateDisplay()
}

async function addPod(pod) {
    const res = await fetch('/add_pod', {
        method: 'POST',
        body: JSON.stringify(pod),
        headers: {
            'content-type': 'application/json'
        }
    })
    if (!res.ok) {
        throw new Error(res)
    }
    pods.unshift(pod)
    updateDisplay()
}

class Pod {
    constructor(name, port, basePath, isActive) {
        this.name = name
        this.port = port
        this.basePath = basePath
        this.isActive = isActive
    }
}

//injecter information 
async function injecterInfo(information){
    var infoCrypter = {info:Cryptage(JSON.stringify(information),key)};
    const res = await fetch('/injecter_info',{
        method:'POST',
        body:JSON.stringify(infoCrypter),
        headers:{
            'content-type': 'application/json'
        }
    })
    if (res.ok) {
        $('#exampleModal').modal('hide');
    }else{
        throw new Error(res)
    }
}

//recuperer information
async function recupererInfo(information) {
    var date1 = new Date();
    var infoCrypter = {info:Cryptage(JSON.stringify(information),key)};
    const res = await fetch('/recuperer_info',{
        method:'POST',
        body:JSON.stringify(infoCrypter),
        headers:{
            'content-type': 'application/json'
        }
    })
    if (res.ok) {
        console.log(res);
        const data = await res.json()
        $('#Dialogue_information').modal('show');
        
        var nom = data.nom;
        var contenue = data.contenue;        
        var date2 = new Date();

        var dure = date2.getMilliseconds() - date1.getMilliseconds();
        $('#info_nom_recuperer').val(nom);
        $('#info_contenue_recuperer').val(contenue);
        $('#info_dure_recuperer').val(dure+" Milisecode");
    }else{
        throw new Error(res)
    }
}
function dateDiff(date1, date2){
    var diff = {}                           // Initialisation du retour
    var tmp = date2 - date1;
 
    tmp = Math.floor(tmp/1000);             // Nombre de secondes entre les 2 dates
    diff.sec = tmp % 60;                    // Extraction du nombre de secondes
 
    tmp = Math.floor((tmp-diff.sec)/60);    // Nombre de minutes (partie entière)
    diff.min = tmp % 60;                    // Extraction du nombre de minutes
 
    tmp = Math.floor((tmp-diff.min)/60);    // Nombre d'heures (entières)
    diff.hour = tmp % 24;                   // Extraction du nombre d'heures
     
    tmp = Math.floor((tmp-diff.hour)/24);   // Nombre de jours restants
    diff.day = tmp;
     
    return diff;
}

var lastTr1;
function block_ligne(objet,id_objet){
    objet.className="option";
    if(lastTr1)lastTr1.className="";
    if(document.getElementById(id_objet).checked){
        lastTr1.className="";
        document.getElementById(id_objet).checked= false;
    }else{
        objet.className="blue";
        lastTr1=objet;
        document.getElementById(id_objet).checked = true;
    }
}

$(document).ready(function() {
    $('.table').footable();
    $("#btn_inject_info").on("click",function() {
        var nom = document.getElementById('info_nom').value;
        var contenue = document.getElementById('info_contenue').value;
        var information = {
            nom : nom,
            contenue : contenue,
        }
        injecterInfo(information);
    })
    $("#btn_recuperer_info").on("click",function() {
        if(document.querySelector('input[name=radio_information]:checked')){
            tableau =document.querySelector('input[name=radio_information]:checked').value;
            chaine = tableau.split("#");
            var nom = chaine[1];
            var information = {
                nom : nom
            }
            recupererInfo(information);
        }else{
            alert("select ligne");
        }
    })
});


main();

