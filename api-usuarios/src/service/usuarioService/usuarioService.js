'use strict';
'esversion: 6';
const AWS = require("aws-sdk");
//Utilitarios
function retrieveBody(event) {
    return JSON.parse(event.body);
}

const params = {
    TableName: process.env.USERS_TABLE,
};
async function saveDataInDynamo(pacienteOBJ) {
    try {
        return dynamoDb
            .put({
                ...params,
                Item: pacienteOBJ,
            })
            .promise();
    } catch (err) {
        throw err;
    }
}

async function deleteDataInDynamo(key, nameTable) {
    try {
        await dynamoDb.delete({
            ...params,
            Key: {
                user_id: key
            },
            ConditionExpression: `attribute_exists(${nameTable})` //Passar o nome da chave definida no serverless.yml no setor de configuração do Dynamo
        })
            .promise();
    } catch (err) {
        throw err;
    }
}

async function updateDataDynamo(userID, data) {
    try {

        const { nome, email } = JSON.parse(data.body);
        await dynamoDb.update({
            ...params,
            Key: {
                user_id: userID
            },
            UpdateExpression:
                'SET nome = :nome, email = :email',
            ConditionExpression: 'attribute_exists(user_id)',
            ExpressionAttributeValues: {
                ':nome': nome,
                ':email': email
            }
        })
            .promise();
    } catch (ex) {
        throw ex;
    }
}

function responseError(ex) {
    let error = ex.name ? ex.name : "Exception";
    let message = ex.message ? ex.message : "Unknown error";
    let code = ex.statusCode ? ex.statusCode : 500;



    if (error == 'ConditionalCheckFailedException') {
        error = 'Registro não existe';
        message = 'O Registro requisitado não existe, por isso não pode ser processado';
        code = 404;
    }

    return {
        statusCode: code,
        body: JSON.stringify({
            error: error,
            message: message
        })
    };
}




const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.saveUser = async (event) => {

    try {

        const timestamp = new Date().getTime();
        //Retorna o json enviado na requisição
        let dados = retrieveBody(event);

        const { nome, email } = dados;


        const paciente = {
            user_id: nome + timestamp,
            nome,
            email
        };
        await saveDataInDynamo(paciente);
        return { "StatusCode": 200 }
    } catch (error) {
        return responseError(error, 500)
    }

};

module.exports.deleteUser = async (event) => {

    try {
        //Passar o nome da PathVariable definida no serverless.yml, isso recuperara o valor da pathVariable informada na URL
        const { userID } = event.pathParameters;
        //Wrapper para deleção de dados no dynamoDB, passando a chave, e a uma conditionalCheck na chave, passando o nome dela na tabela
        await deleteDataInDynamo(userID, "user_id");

        return {
            statusCode: 201
        };
    } catch (err) {
        return responseError(err, 500);


    }


};
module.exports.updateUser = async (event) => {
    try {
        const { userID } = event.pathParameters;
        await updateDataDynamo(userID, event);
        return {
            statusCode: 200
        };
    } catch (err) {
        return responseError(err, 500);

    }
};

module.exports.listUser = async (event) => {

    try {

        let data = await dynamoDb.scan(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
        }

    } catch (err) {
        return responseError(err, 500);

    }
};

