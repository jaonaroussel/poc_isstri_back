const express = require('express');
const CryptoJS  = require("crypto-js");
const crypto = require("crypto");
const LocalPod = require('solid-local-pod');
const fetch = require('solid-local-pod/src/solidFileFetch');
const httpsLocalhost = require('https-localhost')();
const nconf = require('nconf');
const fs = require('fs');

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


const port = 2700;

// La méthode `generateKeyPairSync` accepte deux arguments :
// 1. le type de clé que nous voulons, qui dans ce cas est "rsa".
// 2. un objet avec les propriétés de la clé
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
	// La longueur standard sécurisée par défaut des clés RSA est de 2048 bits.
	modulusLength: 2048,
});

// Ce sont les données que nous voulons crypter.
const data = "my secret data"

const encryptedData = crypto.publicEncrypt(
	{
		key: publicKey,
		padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
		oaepHash: "sha256",
	},
	// Nous convertissons la chaîne de données en un tampon en utilisant `Buffer.from`.
	Buffer.from(data)
)

// Les données cryptées sont sous forme d'octets, nous les imprimons donc au format base64
// pour qu'elles soient affichées sous une forme plus lisible.
console.log("encypted data: ", encryptedData.toString("base64"));

const decryptedData = crypto.privateDecrypt(
	{
		key: privateKey,
		// Afin de décrypter les données, nous devons spécifier les
		// même fonction de hachage et le même schéma de remplissage que nous avons utilisé pour
		// crypter les données à l'étape précédente
		padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
		oaepHash: "sha256",
	},
	encryptedData
)

// Les données décryptées sont de type Buffer, que nous pouvons convertir en une
// chaîne de caractères pour révéler les données originales
console.log("decrypted data: ", decryptedData.toString())


const getCerts = async () => {
    if (!nconf.get('cert')) {
        console.log('genenerer une nouvelle certificat')
        const newCerts = await httpsLocalhost.getCerts()
        nconf.set('cert', newCerts)
        return newCerts
    } else {
        const serializedCert = nconf.get('cert')
        serializedCert.key = Buffer.from(serializedCert.key)
        serializedCert.cert = Buffer.from(serializedCert.cert)
        return serializedCert
    }
}

const app = express();

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.use(express.static(__dirname + '/LocalPodManagerUI'));
app.use(verifyHost, express.json());
app.listen(port, () => {
    console.log(`The app is available at http://localhost:${port}`)
});


/** @type {Object.<string, LocalPod>} */
const pods = {}
nconf.use('file', { file: './storage.json' })
nconf.defaults({ pods: {}, cert: null })
nconf.load(() => initPods())



//6-evoie(recuperation) de information des Pod
app.get('/get_pods', (req, res) => {
    const responsePods = []
    for (const [name, pod] of Object.entries(pods))
        responsePods.push({
            name,
            port: pod.port,
            basePath: pod.basePath,
            isActive: pod.isListening()
        })
    res.status(200).json(responsePods)
})
//1-Creation de la date qui sear recuperer pour tout le monde
app.get('/get_date',(req,res)=>{
    res.status(200).json(new Date());
});

//10-recuperation de données
app.post('/post_information', (req,res) => {
    // Décrypatage de l'iformation reçue en AES(Advanced Encryption Standard)
    // Et conversion du JSON en Objet
    const informationDecrypt = JSON.parse(Decryptage(req.body.data,key));
    console.log(informationDecrypt);

    // segmentation de l'information de l'information
    tabData=informationDecrypt.values.split('');

    for (let i = 0; i < tabData.length; i++) {
        const element = tabData[i];
        console.log(element,new Date());
        const fileContent = JSON.stringify(
            {
                date: new Date(),
                content:element
            }
        );
        const filepath = element+'.json';

        fs.writeFile(filepath, fileContent, (err) => {
            if (err) throw err;
            console.log("The file was succesfully saved!");
        }); 
        
    }
})

app.post('/deactivate_pod', (req, res, next) => {
    const { name } = req.body
    pods[name].stopListening()

    res.status(200).send()
    

    updateStorage()
})

app.post('/activate_pod', (req, res, next) => {
    const { name } = req.body;
    pods[name].startListening();

    res.status(200).send();

})

app.post('/delete_pod', (req, res, next) => {
    const { name } = req.body
    if (pods[name].isListening())
        pods[name].stopListening()

    delete pods[name]
    res.status(200).send()

    updateStorage()
})

app.post('/add_pod', async (req, res, next) => {
    // const config = req.body
    const config ='{'+ req.body.name+','+req.body.port+','+req.body.basePath+'}';
    console.log(config);
    const pod = await createPod(config)
    pods[config.name] = pod
    pod.startListening()
    res.status(200).send()
    updateStorage()
})

function verifyHost(req, res, next) {
    if (req.headers.host !== `localhost:${port}`) {
        return res.status(403).send('Invalid host')
    }
    return next()
}

async function createPod({ name, port, basePath }) {
    const certs = await getCerts()
    return new LocalPod({
        port,
        basePath,
        certs,
        fetch
    })
}

async function initPods() {
    await Promise.all(Object.entries(nconf.get('pods')).map(async ([name, pod]) => {
        const config = {
            name,
            port: pod.port,
            basePath: pod.basePath
        }
        pods[name] = await createPod(config)
        if (pod.isActive)
            pods[name].startListening()
    }))
    console.log('Finished loading')
    console.log(nconf.get('pods'))
}

async function updateStorage() {
    //
    // Save the configuration object to disk
    //
    nconf.set('pods', serializePods(pods))
    return new Promise((resolve, reject) => {
        nconf.save(function (err) {
            if (err) {
                console.error(err.message);
                return;
            }
            console.log('Configuration saved successfully.');
        });
    })
}

function serializePods(pods) {
    const serialized = {}
    for (const [name, pod] of Object.entries(pods)) {
        serialized[name] = {
            port: pod.port,
            basePath: pod.basePath,
            isActive: pod.isListening()
        }
    }
    console.log('serialized', serialized)
    return serialized
}