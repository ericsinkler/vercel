// Packages
const chalk = require('chalk')

// Utilities
const wait = require('../../../../util/output/wait')
const listInput = require('../../../../util/input/list')
const cfg = require('../../util/cfg')
const exit = require('../../../../util/exit')
const success = require('../../../../util/output/success')
const info = require('../../../../util/output/info')
const error = require('../../../../util/output/error')
const param = require('../../../../util/output/param')

async function updateCurrentTeam({ cfg, newTeam } = {}) {
  delete newTeam.created
  delete newTeam.creator_id
  await cfg.merge({ currentTeam: newTeam })
}

module.exports = async function({ teams, args, token }) {
  let stopSpinner = wait('Fetching teams')
  const list = (await teams.ls()).teams
  let { user, currentTeam } = await cfg.read({ token })
  const accountIsCurrent = !currentTeam
  stopSpinner()

  if (accountIsCurrent) {
    currentTeam = {
      slug: user.username || user.email
    }
  }

  if (args.length !== 0) {
    const desiredSlug = args[0]

    const newTeam = list.find(team => team.slug === desiredSlug)
    if (newTeam) {
      await updateCurrentTeam({ cfg, newTeam })
      success(`The team ${chalk.bold(newTeam.name)} is now active!`)
      return exit()
    }
    if (desiredSlug === user.username) {
      stopSpinner = wait('Saving')
      await cfg.remove('currentTeam')
      stopSpinner()
      return success(`Your account (${chalk.bold(desiredSlug)}) is now active!`)
    }
    error(`Could not find membership for team ${param(desiredSlug)}`)
    return exit(1)
  }

  const choices = list.map(({ slug, name }) => {
    name = `${slug} (${name})`
    if (slug === currentTeam.slug) {
      name += ` ${chalk.bold('(current)')}`
    }

    return {
      name,
      value: slug,
      short: slug
    }
  })

  const suffix = accountIsCurrent ? ` ${chalk.bold('(current)')}` : ''

  const userEntryName = user.username
    ? `${user.username} (${user.email})${suffix}`
    : user.email

  choices.unshift({
    name: userEntryName,
    value: user.email,
    short: user.username
  })

  // Let's bring the current team to the beginning of the list
  if (!accountIsCurrent) {
    const index = choices.findIndex(choice => choice.value === currentTeam.slug)
    const choice = choices.splice(index, 1)[0]
    choices.unshift(choice)
  }

  let message

  if (currentTeam) {
    message = `Switch to:`
  }

  const choice = await listInput({
    message,
    choices,
    separator: false
  })

  // Abort
  if (!choice) {
    info('No changes made')
    return exit()
  }

  const newTeam = list.find(item => item.slug === choice)

  // Switch to account
  if (!newTeam) {
    if (currentTeam.slug === user.username || currentTeam.slug === user.email) {
      info('No changes made')
      return exit()
    }
    stopSpinner = wait('Saving')
    await cfg.remove('currentTeam')
    stopSpinner()
    return success(`Your account (${chalk.bold(choice)}) is now active!`)
  }

  if (newTeam.slug === currentTeam.slug) {
    info('No changes made')
    return exit()
  }

  stopSpinner = wait('Saving')
  await updateCurrentTeam({ cfg, newTeam })
  stopSpinner()

  success(`The team ${chalk.bold(newTeam.name)} is now active!`)
}
