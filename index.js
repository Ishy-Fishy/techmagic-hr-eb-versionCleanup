/**
 * Created by kostyasemyanystyi on 12/4/17.
 */
'use strict'
const AWS = require('aws-sdk')
const eb = new AWS.ElasticBeanstalk({region: 'eu-central-1'})

exports.handler = (event, context, callback) => {
  if (!event.appName) callback(Error('No application name provided'), 'Error:appName')
  if (!event.envName) callback(Error('No environment name provided'), 'Error:envName')
  const appName = event.appName
  const envName = event.envName
  const describeAppVerParams = {
    ApplicationName: appName
  }
  const regexCore = [appName, envName]
  const regex = new RegExp('^' + regexCore[0] + '\\.' + regexCore[1] + '\\.')
  eb.describeApplicationVersions(describeAppVerParams, (err, data) => {
    const versions = data.ApplicationVersions
    let validAppVersions = []
    for (let version of versions) {
      if (!version.VersionLabel) continue
      let label = version.VersionLabel
      if (regex.test(label)) validAppVersions.push(label)
    }
    if (validAppVersions.length <= 10) {
      const response = {
        message: 'Valid application versions for environment ' + envName + ' do not exceed 10 ',
        code: 200
      }
      callback(null, response)
    } else {
      const versionsToDelete = validAppVersions.slice(9) // zero-based index
      deleteAppVersions.call({ApplicationName: appName}, versionsToDelete)
        .then(() => {
          const response = {
            message: versionsToDelete.length + ' versions were deleted successfully for environment ' + envName,
            code: 200
          }
          callback(null, response)
        })
        .catch((err) => {
          const response = {
            message: err.message,
            code: err.code || 500
          }
          callback(err, response)
        })
    }
  })
}

function deleteAppVersions (versionLabelArr) {
  if (this === void null) throw Error('No config found inside function scope, terminating lambda')
  let promises = []
  for (let versionLabel of versionLabelArr) {
    promises.push(singleDelete.call(this, versionLabel))
  }
  return Promise.all(promises)

  function singleDelete (versionLabel) {
    return new Promise((resolve, reject) => {
      const params = {
        ApplicationName: this.ApplicationName,
        DeleteSourceBundle: true,
        VersionLabel: versionLabel
      }
      eb.deleteApplicationVersion(params, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }
}