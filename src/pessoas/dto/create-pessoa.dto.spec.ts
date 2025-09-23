import { validate } from "class-validator"
import { CreatePessoaDto } from "./create-pessoa.dto"

describe(`CreatePessoaDTO`, () => {
  it(`deve validar um DTO valido`, async () => {
    const dto = new CreatePessoaDto()
    dto.nome = 'Nome da Pessoa'
    dto.email = `nome@gmail.com`
    dto.password = `senha123`

    const error = await validate(dto)
    expect(error.length).toBe(0)
  })

  it(`deve falhar se o email for invalido`, async () => {
    const dto = new CreatePessoaDto()
    dto.nome = 'Nome da Pessoa'
    dto.email = `emailinvalido`
    dto.password = `senha123`

    const error = await validate(dto)
    expect(error.length).toBeGreaterThan(0)
    expect(error[0].property).toBe(`email`)
  })

  it(`deve falhar se a senha for muito curta`, async () => {
    const dto = new CreatePessoaDto()
    dto.nome = 'Nome da Pessoa'
    dto.email = `nome@gmail.com`
    dto.password = `123`

    const error = await validate(dto)
    expect(error.length).toBeGreaterThan(0)
    expect(error[0].property).toBe(`password`)
  })

  it(`deve falhar se o nome for vazio`, async () => {
    const dto = new CreatePessoaDto()
    dto.nome = ''
    dto.email = `nome@gmail.com`
    dto.password = `senha123`

    const error = await validate(dto)

    expect(error.length).toBeGreaterThan(0)
    expect(error[0].property).toBe(`nome`)
  })

  it(`deve falhar se o nome for muito longo`, async () => {
    const dto = new CreatePessoaDto()
    dto.nome = 'Nome da Pessoa'.repeat(100)
    dto.email = `nome@gmail.com`
    dto.password = `senha123`

    const errror = await validate(dto)
    expect(errror.length).toBeGreaterThan(0)
    expect(errror[0].property).toBe(`nome`)
  })


})
