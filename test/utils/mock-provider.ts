import fetch from 'node-fetch'
import {join as joinPath} from 'path'
import {promisify} from 'util'
import {readFile as _readFile, writeFile as _writeFile} from 'fs'

const readFile = promisify(_readFile)
const writeFile = promisify(_writeFile)

import {APIMethods, APIProvider, Bytes, Checksum160, FetchProvider} from '@wharfkit/antelope'

export class MockProvider implements APIProvider {
    recordProvider = new FetchProvider('https://jungle3.greymass.com', {fetch})

    constructor(private dir: string) {}

    getFilename(path: string, params?: unknown) {
        const digest = Checksum160.hash(
            Bytes.from(path + (params ? JSON.stringify(params) : ''), 'utf8')
        )
        return joinPath(this.dir, digest + '.json')
    }

    async getExisting(filename: string) {
        const data = await readFile(filename)
        return {status: 200, json: JSON.parse(data.toString('utf8')), text: data, headers: {}}
    }

    async call(args: {path: string; params?: unknown; methods?: APIMethods | undefined}) {
        const filename = this.getFilename(args.path, args.params)
        if (process.env['MOCK_RECORD'] !== 'overwrite') {
            const existing = await this.getExisting(filename)
            if (existing) {
                return existing
            }
        }
        if (process.env['MOCK_RECORD']) {
            const response = await this.recordProvider.call(args)
            const json = JSON.stringify(response, undefined, 4)
            await writeFile(filename, json)
            return response
        } else {
            throw new Error(`No data for ${args.path}`)
        }
    }
}
