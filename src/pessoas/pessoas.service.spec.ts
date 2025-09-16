import { Repository } from "typeorm";
import { PessoasService } from "./pessoas.service"
import { Pessoa } from "./entities/pessoa.entity";
import { HashingService } from "src/auth/hashing/hashing.service";
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from "@nestjs/typeorm";
import { CreatePessoaDto } from "./dto/create-pessoa.dto";

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
          useValue: {
            save: jest.fn(),
            create: jest.fn()

          }
        },
        {
          provide: HashingService, // injeta um fake do hashing
          useValue: {
            hash: jest.fn()
          }
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

  describe('Testando a logica de cada metado create, findAll, findOne, update e remove', () => {
    it('Metado create: deve criar uma nova pessoa', async () => {
      // Arrange
      const createPessoaDto: CreatePessoaDto = {
        email: 'caio@gmail.com',
        nome: 'caio',
        password: '1254'
      }
      const passwordHash = 'HASHDESENHA'
      const newPerson = {id: 1, nome: createPessoaDto.nome, email: createPessoaDto.email, passwordHash}

      //Como o valor retornado por hashingService.hash é necessario
      // vamos simular este valorr
      jest.spyOn(hashingService, "hash").mockResolvedValue('HASHDESENHA')
      //como a pessoa retornada por pessoaRepository.create é necessaria em pessoaRepository.save. Vamos simular esse valor
      jest.spyOn(pessoaRepository, "create").mockReturnValue(newPerson as any)

      // Act -> Ação
      const result =await pessoaService.create(createPessoaDto)

      // Assert
      // O metado hashingService.hash foi chamado com createPessoaDto.password?
      expect(hashingService.hash).toHaveBeenCalledWith(createPessoaDto.password)

      //o metado pessoaRepository.create foi chamado com os dados da nova pessoa com o hash de senha gerado por hashingService.hash?
      expect(pessoaRepository.create).toHaveBeenCalledWith({
        nome: createPessoaDto.nome,
        passwordHash,
        email: createPessoaDto.email,
      })

      //o metado pessoaRepository.create foi chamado com os dados da nova pessoa gerado por pessoaRepository.create?
      expect(pessoaRepository.save).toHaveBeenCalledWith(newPerson)

      //O resultado do metado pessoaService.create retornou a nova pessoa criada?
      expect(result).toEqual(newPerson)
    })
  })
})
