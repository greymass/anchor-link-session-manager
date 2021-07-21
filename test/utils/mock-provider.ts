import fetch from 'node-fetch'
import {join as joinPath} from 'path'
import {promisify} from 'util'
import {readFile as _readFile, writeFile as _writeFile} from 'fs'

const readFile = promisify(_readFile)
const writeFile = promisify(_writeFile)

import {APIProvider, Bytes, Checksum160, FetchProvider} from '@greymass/eosio'

export class MockProvider implements APIProvider {
    recordProvider = new FetchProvider('https://jungle3.greymass.com', {fetch})

    constructor(private dir: string) {}

    getFilename(path: string, params?: unknown) {
        const digest = Checksum160.from(
            Bytes.from(path + (params ? JSON.stringify(params) : ''), 'utf8')
        )
        return joinPath(this.dir, digest + '.json')
    }

    async getExisting(filename: string) {
        try {
            const data = await readFile(filename)
            return JSON.parse(data.toString('utf8'))
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error
            }
        }
    }

    async call(path: string, params?: unknown) {
        const filename = this.getFilename(path, params)
        if (process.env['MOCK_RECORD'] !== 'overwrite') {
            const existing = await this.getExisting(filename)
            if (existing) {
                return existing
            }
        }
        if (process.env['MOCK_RECORD']) {
            const response = await this.recordProvider.call(path, params)
            const json = JSON.stringify(response, undefined, 4)
            await writeFile(filename, json)
            return response
        } else {
            throw new Error(`No data for ${path}`)
        }
    }
}
