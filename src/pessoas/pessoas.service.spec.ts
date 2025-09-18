import { Repository } from "typeorm";
import { PessoasService } from "./pessoas.service"
import { Pessoa } from "./entities/pessoa.entity";
import { HashingService } from "src/auth/hashing/hashing.service";
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from "@nestjs/typeorm";
import { CreatePessoaDto } from "./dto/create-pessoa.dto";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import * as path from 'path'
import * as fs from 'fs/promises'

jest.mock('fs/promises')

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
            create: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            preload: jest.fn(),
            remove: jest.fn()

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
    describe('Metado create:', () => {

      it('deve criar uma nova pessoa', async () => {
        // Arrange
        const createPessoaDto: CreatePessoaDto = {
          email: 'caio@gmail.com',
          nome: 'caio',
          password: '1254'
        }
        const passwordHash = 'HASHDESENHA'
        const newPerson = { id: 1, nome: createPessoaDto.nome, email: createPessoaDto.email, passwordHash }

        //Como o valor retornado por hashingService.hash é necessario
        // vamos simular este valorr
        jest.spyOn(hashingService, "hash").mockResolvedValue('HASHDESENHA')
        //como a pessoa retornada por pessoaRepository.create é necessaria em pessoaRepository.save. Vamos simular esse valor
        jest.spyOn(pessoaRepository, "create").mockReturnValue(newPerson as any)

        // Act -> Ação
        const result = await pessoaService.create(createPessoaDto)

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

      it('deve lançar ConflictException quando e-mail ja existe ', async () => {

        jest.spyOn(pessoaRepository, 'save').mockRejectedValue({
          code: '23505'
        })

        await expect(pessoaService.create({} as any)).rejects.toThrow(ConflictException)
      })

      it('deve lançar error generico quando o error for lançado  ', async () => {

        jest.spyOn(pessoaRepository, 'save').mockRejectedValue(new Error('Error generico'))

        await expect(pessoaService.create({} as any)).rejects.toThrow(new Error('Error generico'))
      })
    })

    describe('Metado findOne: ', () => {
      it('deve retorna uma pessoas se ela foi encontrada', async () => {
        const pessoaId = 1
        const pessoaEncontrada = {
          id: pessoaId,
          nome: 'Luiz',
          email: 'caio@gmail.com',
          passwordHash: '25464'
        }

        jest.spyOn(pessoaRepository, 'findOneBy').mockResolvedValue(pessoaEncontrada as any)

        const result = await pessoaService.findOne(pessoaId)

        expect(result).toEqual(pessoaEncontrada)
      })

      it('deve retorna um error quando a pessoa n for encontrada!', async () => {
        const pessoaId = 1
        const pessoaEncontrada = {
          id: pessoaId,
          nome: 'Luiz',
          email: 'caio@gmail.com',
          passwordHash: '25464'
        }

        await expect(pessoaService.findOne(pessoaId)).rejects.toThrow(new NotFoundException('Pessoa não encontrada'))

      })
    })

    describe('Metado FindAll', () => {
      it('deve retornar todas as pessoas', async () => {
        const pessoasMock: Pessoa[] = [
          {
            id: 1,
            nome: 'Luiz',
            email: 'caio@gmail.com',
            passwordHash: '25464'
          } as Pessoa
        ]

        jest.spyOn(pessoaRepository, 'find').mockResolvedValue(pessoasMock)

        const result = await pessoaService.findAll()

        expect(result).toEqual(pessoasMock)
        expect(pessoaRepository.find).toHaveBeenCalledWith({
          order: {
            id: 'desc',
          },
        })
      })

      describe('Metado update: ', () => {
        it('deve atualizar uma pessoa se for autorizado', async () => {
          //Arrange
          const pessoaId = 1
          const updatePessoaDto = { nome: 'Luiz', password: '25464' }
          const tokenPayload = { sub: pessoaId } as any
          const passwordHash = 'HASHDESENHA'
          const updatedPessoa = { id: pessoaId, nome: 'Jonas', passwordHash }

          jest.spyOn(hashingService, `hash`).mockResolvedValueOnce(passwordHash)
          jest.spyOn(pessoaRepository, `preload`).mockResolvedValue(updatedPessoa as any)
          jest.spyOn(pessoaRepository, `save`).mockResolvedValue(updatedPessoa as any)
          //Act
          const result = await pessoaService.update(pessoaId, updatePessoaDto, tokenPayload)

          //Assert
          expect(hashingService.hash).toHaveBeenCalledWith(updatePessoaDto.password)
          expect(pessoaRepository.preload).toHaveBeenCalledWith({
            id: pessoaId,
            nome: updatePessoaDto.nome,
            passwordHash
          })
          expect(pessoaRepository.save).toHaveBeenCalledWith(updatedPessoa)
          expect(result).toEqual(updatedPessoa)
        })

        it('deve lança ForbiddenException se usuario não autorizado', async () => {
          const pessoaId = 1
          const tokenPayload = { sub: 2 } as any
          const updatePessoaDto = { nome: 'Joe Doe' }
          const exitingPessoa = { id: pessoaId, nome: 'Joe Doe' }

          jest.spyOn(pessoaRepository, 'preload').mockResolvedValue(exitingPessoa as any)

          await expect(pessoaService.update(pessoaId, updatePessoaDto, tokenPayload)).rejects.toThrow(ForbiddenException)
        })

        it('deve lança NotFoundException se a pessoa não existir', async () => {
          const pessoaId = 1
          const tokenPayload = { sub: pessoaId } as any
          const updatePessoaDto = { nome: 'Joe Doe' }

          jest.spyOn(pessoaRepository, 'preload').mockResolvedValue(null)

          await expect(pessoaService.update(pessoaId, updatePessoaDto, tokenPayload)).rejects.toThrow(NotFoundException)
        })
      })

      describe('Metado remove', () => {
        it('deve remover uma pessoa se autorizada', async () => {
          const pessoaId = 1
          const tokenPayload = { sub: pessoaId } as any
          const existingPessoa = { id: pessoaId, nome: 'joe Doe' }

          jest.spyOn(pessoaService, 'findOne').mockResolvedValue(existingPessoa as any)
          jest.spyOn(pessoaRepository, 'remove').mockResolvedValue(existingPessoa as any)

          const result = await pessoaService.remove(pessoaId, tokenPayload)

          expect(pessoaService.findOne).toHaveBeenCalledWith(pessoaId)
          expect(pessoaRepository.remove).toHaveBeenCalledWith(existingPessoa)
          expect(result).toEqual(existingPessoa)
        })

        it('deve lança ForbiddenException se não autorizado', async () => {
          const pessoaId = 1
          const tokenPayload = { sub: 2 } as any
          const existingPessoa = { id: pessoaId, nome: 'joe Doe' }

          jest.spyOn(pessoaService, 'findOne').mockResolvedValue(existingPessoa as any)

          await expect(pessoaService.remove(pessoaId, tokenPayload)).rejects.toThrow(ForbiddenException)
        })

        it('deve lança NotFoundException se a pessoa não for encontrada', async () => {
          const pessoaId = 1
          const tokenPayload = { sub: pessoaId } as any

          jest.spyOn(pessoaService, 'findOne').mockRejectedValue(new NotFoundException() as any)

          await expect(pessoaService.remove(pessoaId, tokenPayload)).rejects.toThrow(NotFoundException)
        })
      })
      describe('metado uploadPicture', () => {
        it('deve salva a imagem corretamente e atualizar a pessoa', async () => {
          const mockFile = {
            originalname: 'test.png',
            size: 2000,
            buffer: Buffer.from('file content'),
          } as Express.Multer.File

          const mockPessoa = {
            id: 1,
            nome: 'Joe Doe',
            email: 'joe@gmail.com'
          } as Pessoa;

          const tokenPayload = { sub: 1 } as any

          jest.spyOn(pessoaService, 'findOne').mockResolvedValue(mockPessoa)
          jest.spyOn(pessoaRepository, 'save').mockResolvedValue({
            ...mockPessoa,
            picture: '1.png'
          })

          const filePath = path.resolve(process.cwd(), 'pictures', '1.png')

          const result = await pessoaService.uploadPicture(mockFile, tokenPayload)

          expect(fs.writeFile).toHaveBeenCalledWith(filePath, mockFile.buffer)
          expect(pessoaRepository.save).toHaveBeenCalledWith({
            ...mockPessoa,
            picture: '1.png'
          })
          expect(result).toEqual({
            ...mockPessoa,
            picture: '1.png'
          })
        })

        it('deve lança BadRequestException se o arquivo for muito pequeno', async () => {
          const mockFile = {
            originalname: 'test.png',
            size: 500,
            buffer: Buffer.from('small content'),
          } as Express.Multer.File

          const tokenPayload = { sub: 1 } as any

          expect(pessoaService.uploadPicture(mockFile, tokenPayload)).rejects.toThrow(BadRequestException)
        })

        it('deve lançar NotFoundException se a pessoa não for encontrada', async () => {
          // Arrange
          const mockFile = {
            originalname: 'test.png',
            size: 2000,
            buffer: Buffer.from('file content'),
          } as Express.Multer.File;

          const tokenPayload = { sub: 1 } as any;

          jest
            .spyOn(pessoaService, 'findOne')
            .mockRejectedValue(new NotFoundException());

          // Act & Assert
          await expect(
            pessoaService.uploadPicture(mockFile, tokenPayload),
          ).rejects.toThrow(NotFoundException);
        });
      })
    })
  })
})
