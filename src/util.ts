import axios, { AxiosError } from 'axios'

const CORS_PROXY = 'https://polished-meadow-3c4e.foobar.workers.dev/?'
const CORS_PROXY2 = 'https://safe-fortress-20275.herokuapp.com/'

const debug = console.log

export async function getWithCors (url: string) {
  const getRes = (tryNum = 0) => {
    return axios.get(
      `${tryNum === 0 ? CORS_PROXY : CORS_PROXY2}${url}`,
    )
  }

  let ret

  const handleError = (e: AxiosError) => {
    console.error(e)
    if (e.response && e.response.status === 429) {
      try {
        return getRes(1)
      } catch (ee) {
        throw getAppError('rate-limited')
      }
    }

    throw e
  }

  try {
    ret = await getRes()
  } catch (e) {
    ret = await handleError(e)
  }

  return ret.data
}

function getAppError (mes: string) {
  const e = new Error(mes)

  e.name = 'AppError'

  return e
}
