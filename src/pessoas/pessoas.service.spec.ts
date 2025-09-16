import { Repository } from "typeorm";
import { PessoasService } from "./pessoas.service"
import { Pessoa } from "./entities/pessoa.entity";
import { HashingService } from "src/auth/hashing/hashing.service";
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from "@nestjs/typeorm";

// Mock (Mock é uma versão falsa de algo real, usada em testes para isolar e controlar o comportamento daquilo que você não quer (ou não pode) executar de verdade.)

describe('PessoasService', () => {
  let pessoaService: PessoasService; // instância do service a ser testado
  let pessoaRepository: Repository<Pessoa>; // mock do repositório do TypeORM
  let hashingService: HashingService; // mock do serviço de hash

  beforeEach(async () => {
    // cria um módulo de teste do NestJS com os providers necessários
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PessoasService, // service real
        {
          provide: getRepositoryToken(Pessoa), // injeta um fake do repositório
          useValue: {}
        },
        {
          provide: HashingService, // injeta um fake do hashing
          useValue: {}
        }
      ]
    }).compile()

    // pega as instâncias injetadas do módulo de teste
    pessoaService = module.get<PessoasService>(PessoasService)
    pessoaRepository = module.get<Repository<Pessoa>>(getRepositoryToken(Pessoa))
    hashingService = module.get<HashingService>(HashingService)
  })

  it('PessoasService deve estar definido', () => {
    // garante que o service foi criado corretamente
    expect(pessoaService).toBeDefined()
  })
})
